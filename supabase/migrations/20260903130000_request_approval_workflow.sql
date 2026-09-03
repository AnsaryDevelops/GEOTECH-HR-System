-- Three-stage request approval workflow.

CREATE TABLE IF NOT EXISTS company_approval_routing (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  technical_manager_id UUID NOT NULL REFERENCES profiles(id),
  general_manager_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_approval_routing_managers_different
    CHECK (technical_manager_id <> general_manager_id)
);

CREATE OR REPLACE FUNCTION validate_company_approval_routing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.technical_manager_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Technical Manager must be an active profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.general_manager_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'General Manager must be an active profile';
  END IF;

  IF NEW.technical_manager_id = NEW.general_manager_id THEN
    RAISE EXCEPTION 'Technical Manager and General Manager must be different';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_company_approval_routing ON company_approval_routing;
CREATE TRIGGER trg_validate_company_approval_routing
  BEFORE INSERT OR UPDATE ON company_approval_routing
  FOR EACH ROW EXECUTE FUNCTION validate_company_approval_routing();

-- Resolve the initial assignments by business-facing employee number, then store UUIDs.
DO $$
DECLARE
  technical_manager UUID;
  general_manager UUID;
BEGIN
  SELECT id INTO technical_manager
  FROM profiles
  WHERE employee_number = 'EMP-00002' AND status = 'ACTIVE';

  SELECT id INTO general_manager
  FROM profiles
  WHERE employee_number = 'EMP-00006' AND status = 'ACTIVE';

  IF technical_manager IS NULL OR general_manager IS NULL THEN
    RAISE EXCEPTION 'Initial Technical Manager or General Manager profile is missing or inactive';
  END IF;

  INSERT INTO company_approval_routing (id, technical_manager_id, general_manager_id)
  VALUES (1, technical_manager, general_manager)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_approval_routing_updated_at ON company_approval_routing;
CREATE TRIGGER trg_company_approval_routing_updated_at
  BEFORE UPDATE ON company_approval_routing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE requests ADD COLUMN IF NOT EXISTS approval_stage TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS current_approver_id UUID REFERENCES profiles(id);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS current_approver_name TEXT;

UPDATE requests
SET approval_stage = 'DIRECT_MANAGER',
    current_approver_id = manager_id,
    current_approver_name = manager_name
WHERE approval_stage IS NULL;

ALTER TABLE requests
  ALTER COLUMN approval_stage SET DEFAULT 'DIRECT_MANAGER',
  ALTER COLUMN approval_stage SET NOT NULL;

ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_approval_stage_check;
ALTER TABLE requests ADD CONSTRAINT requests_approval_stage_check
  CHECK (approval_stage IN ('DIRECT_MANAGER', 'TECHNICAL_MANAGER', 'GENERAL_MANAGER'));

CREATE INDEX IF NOT EXISTS idx_requests_current_approver_id
  ON requests(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_requests_approval_stage
  ON requests(approval_stage);

CREATE TABLE IF NOT EXISTS request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  approver_id UUID NOT NULL REFERENCES profiles(id),
  approver_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT request_approvals_stage_check
    CHECK (stage IN ('DIRECT_MANAGER', 'TECHNICAL_MANAGER', 'GENERAL_MANAGER')),
  CONSTRAINT request_approvals_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT request_approvals_decision_fields_check
    CHECK (
      (status = 'PENDING' AND decided_at IS NULL)
      OR (status IN ('APPROVED', 'REJECTED') AND decided_at IS NOT NULL)
    ),
  CONSTRAINT request_approvals_unique_stage UNIQUE (request_id, stage)
);

-- Backfill the first-stage history for requests created before this migration.
INSERT INTO request_approvals (request_id, stage, approver_id, approver_name, status, comment, decided_at)
SELECT r.id,
       'DIRECT_MANAGER',
       r.manager_id,
       r.manager_name,
       CASE WHEN r.status = 'REJECTED' THEN 'REJECTED'
            WHEN r.status = 'APPROVED' THEN 'APPROVED'
            ELSE 'PENDING' END,
       CASE WHEN r.status = 'REJECTED' THEN r.decision_comment ELSE NULL END,
       CASE WHEN r.status IN ('REJECTED', 'APPROVED') THEN r.decided_at ELSE NULL END
FROM requests r
ON CONFLICT (request_id, stage) DO NOTHING;

-- Existing rows cannot be advanced from their old single-stage representation;
-- create pending records for the two configured company-wide stages.
INSERT INTO request_approvals (request_id, stage, approver_id, approver_name)
SELECT r.id, 'TECHNICAL_MANAGER', p.id, COALESCE(p.name, p.first_name || ' ' || p.last_name)
FROM requests r
CROSS JOIN company_approval_routing c
JOIN profiles p ON p.id = c.technical_manager_id
WHERE r.status = 'PENDING'
ON CONFLICT (request_id, stage) DO NOTHING;

INSERT INTO request_approvals (request_id, stage, approver_id, approver_name)
SELECT r.id, 'GENERAL_MANAGER', p.id, COALESCE(p.name, p.first_name || ' ' || p.last_name)
FROM requests r
CROSS JOIN company_approval_routing c
JOIN profiles p ON p.id = c.general_manager_id
WHERE r.status = 'PENDING'
ON CONFLICT (request_id, stage) DO NOTHING;

ALTER TABLE company_approval_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_approval_routing_select_hr" ON company_approval_routing;
CREATE POLICY "company_approval_routing_select_hr"
  ON company_approval_routing FOR SELECT TO authenticated
  USING (is_hr());

DROP POLICY IF EXISTS "company_approval_routing_update_hr" ON company_approval_routing;
CREATE POLICY "company_approval_routing_update_hr"
  ON company_approval_routing FOR UPDATE TO authenticated
  USING (is_hr())
  WITH CHECK (is_hr());

DROP POLICY IF EXISTS "company_approval_routing_insert_hr" ON company_approval_routing;
CREATE POLICY "company_approval_routing_insert_hr"
  ON company_approval_routing FOR INSERT TO authenticated
  WITH CHECK (is_hr());

DROP POLICY IF EXISTS "request_approvals_select" ON request_approvals;
CREATE POLICY "request_approvals_select"
  ON request_approvals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_approvals.request_id
        AND (
          r.employee_id = auth.uid()
          OR r.current_approver_id = auth.uid()
          OR request_approvals.approver_id = auth.uid()
          OR is_hr()
        )
    )
  );

DROP POLICY IF EXISTS "request_approvals_insert" ON request_approvals;
DROP POLICY IF EXISTS "request_approvals_update" ON request_approvals;
DROP POLICY IF EXISTS "request_approvals_delete" ON request_approvals;

DROP POLICY IF EXISTS "requests_select" ON requests;
CREATE POLICY "requests_select"
  ON requests FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR current_approver_id = auth.uid()
    OR is_hr()
  );

DROP POLICY IF EXISTS "requests_insert" ON requests;
CREATE POLICY "requests_insert"
  ON requests FOR INSERT TO authenticated
  WITH CHECK (is_hr());

DROP POLICY IF EXISTS "requests_update" ON requests;
CREATE POLICY "requests_update"
  ON requests FOR UPDATE TO authenticated
  USING (is_hr())
  WITH CHECK (is_hr());

CREATE OR REPLACE FUNCTION submit_request(
  p_type TEXT,
  p_leave_type_name TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_end_time TIME DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_profile profiles%ROWTYPE;
  direct_manager profiles%ROWTYPE;
  technical_manager profiles%ROWTYPE;
  general_manager profiles%ROWTYPE;
  routing company_approval_routing%ROWTYPE;
  created_request requests%ROWTYPE;
  approval_rows JSONB;
BEGIN
  SELECT * INTO employee_profile FROM profiles WHERE id = auth.uid();
  IF employee_profile.id IS NULL OR employee_profile.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Active employee profile is required';
  END IF;

  IF employee_profile.manager_id IS NULL THEN
    RAISE EXCEPTION 'A direct manager is required';
  END IF;

  SELECT * INTO direct_manager FROM profiles
  WHERE id = employee_profile.manager_id AND status = 'ACTIVE';
  IF direct_manager.id IS NULL THEN
    RAISE EXCEPTION 'An active direct manager is required';
  END IF;

  SELECT * INTO routing FROM company_approval_routing WHERE id = 1;
  IF routing.id IS NULL THEN
    RAISE EXCEPTION 'Company approval routing is not configured';
  END IF;

  SELECT * INTO technical_manager FROM profiles
  WHERE id = routing.technical_manager_id AND status = 'ACTIVE';
  SELECT * INTO general_manager FROM profiles
  WHERE id = routing.general_manager_id AND status = 'ACTIVE';
  IF technical_manager.id IS NULL OR general_manager.id IS NULL THEN
    RAISE EXCEPTION 'Company approval routing contains an inactive manager';
  END IF;

  IF p_type NOT IN ('LEAVE', 'MISSION') THEN
    RAISE EXCEPTION 'Invalid request type';
  END IF;

  INSERT INTO requests (
    employee_id, employee_name, manager_id, manager_name, type, status,
    leave_type_name, start_date, end_date, reason, start_time, end_time,
    location, purpose, approval_stage, current_approver_id, current_approver_name
  ) VALUES (
    employee_profile.id,
    COALESCE(employee_profile.name, employee_profile.first_name || ' ' || employee_profile.last_name),
    direct_manager.id,
    COALESCE(direct_manager.name, direct_manager.first_name || ' ' || direct_manager.last_name),
    p_type, 'PENDING', p_leave_type_name, p_start_date, p_end_date, p_reason,
    p_start_time, p_end_time, p_location, p_purpose,
    'DIRECT_MANAGER', direct_manager.id,
    COALESCE(direct_manager.name, direct_manager.first_name || ' ' || direct_manager.last_name)
  ) RETURNING * INTO created_request;

  INSERT INTO request_approvals (request_id, stage, approver_id, approver_name)
  VALUES
    (created_request.id, 'DIRECT_MANAGER', direct_manager.id, COALESCE(direct_manager.name, direct_manager.first_name || ' ' || direct_manager.last_name)),
    (created_request.id, 'TECHNICAL_MANAGER', technical_manager.id, COALESCE(technical_manager.name, technical_manager.first_name || ' ' || technical_manager.last_name)),
    (created_request.id, 'GENERAL_MANAGER', general_manager.id, COALESCE(general_manager.name, general_manager.first_name || ' ' || general_manager.last_name));

  INSERT INTO notifications (user_id, type, request_id, message)
  VALUES (
    direct_manager.id, 'REQUEST_SUBMITTED', created_request.id,
    created_request.employee_name || ' submitted a ' || p_type || ' request.'
  );

  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at), '[]'::jsonb)
  INTO approval_rows FROM request_approvals a WHERE a.request_id = created_request.id;

  RETURN jsonb_build_object('request', to_jsonb(created_request), 'approvals', approval_rows);
END;
$$;

CREATE OR REPLACE FUNCTION decide_request(
  p_request_id UUID,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_request requests%ROWTYPE;
  current_approval request_approvals%ROWTYPE;
  next_approval request_approvals%ROWTYPE;
  new_status TEXT;
  approval_rows JSONB;
  label TEXT;
BEGIN
  SELECT * INTO current_request FROM requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF current_request.id IS NULL OR current_request.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  IF current_request.current_approver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the current approver may decide this request';
  END IF;

  SELECT * INTO current_approval FROM request_approvals
  WHERE request_id = current_request.id
    AND stage = current_request.approval_stage
  FOR UPDATE;

  IF current_approval.id IS NULL OR current_approval.status <> 'PENDING'
     OR current_approval.approver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Approval stage is invalid or already decided';
  END IF;

  IF p_action NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'Invalid approval action';
  END IF;

  IF p_action = 'REJECT' AND NULLIF(btrim(COALESCE(p_comment, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A rejection comment is required';
  END IF;

  new_status := CASE WHEN p_action = 'REJECT' THEN 'REJECTED' ELSE 'APPROVED' END;
  UPDATE request_approvals
  SET status = new_status,
      comment = NULLIF(btrim(p_comment), ''),
      decided_at = now()
  WHERE id = current_approval.id;

  IF p_action = 'REJECT' THEN
    UPDATE requests
    SET status = 'REJECTED', decided_at = now(), decision_comment = NULLIF(btrim(p_comment), ''),
        current_approver_id = NULL, current_approver_name = NULL
    WHERE id = current_request.id;

    INSERT INTO notifications (user_id, type, request_id, message)
    VALUES (current_request.employee_id, 'REQUEST_REJECTED', current_request.id,
            'Your request ' || current_request.request_number || ' was rejected.');
  ELSE
    SELECT * INTO next_approval FROM request_approvals
    WHERE request_id = current_request.id
      AND stage = CASE current_request.approval_stage
        WHEN 'DIRECT_MANAGER' THEN 'TECHNICAL_MANAGER'
        WHEN 'TECHNICAL_MANAGER' THEN 'GENERAL_MANAGER'
        ELSE NULL
      END;

    IF next_approval.id IS NULL THEN
      UPDATE requests
      SET status = 'APPROVED', decided_at = now(),
          current_approver_id = NULL, current_approver_name = NULL
      WHERE id = current_request.id;

      INSERT INTO notifications (user_id, type, request_id, message)
      VALUES (current_request.employee_id, 'REQUEST_APPROVED', current_request.id,
              'Your request ' || current_request.request_number || ' was approved.');
    ELSE
      UPDATE requests
      SET approval_stage = next_approval.stage,
          current_approver_id = next_approval.approver_id,
          current_approver_name = next_approval.approver_name
      WHERE id = current_request.id;

      label := CASE next_approval.stage
        WHEN 'TECHNICAL_MANAGER' THEN 'Technical Manager'
        ELSE 'General Manager'
      END;
      INSERT INTO notifications (user_id, type, request_id, message)
      VALUES (next_approval.approver_id, 'REQUEST_SUBMITTED', current_request.id,
              'A request is waiting for ' || label || ' approval.');
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at), '[]'::jsonb)
  INTO approval_rows FROM request_approvals a WHERE a.request_id = current_request.id;

  RETURN jsonb_build_object(
    'request', to_jsonb((SELECT r FROM requests r WHERE r.id = current_request.id)),
    'approvals', approval_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION submit_request(TEXT, TEXT, DATE, DATE, TEXT, TIME, TIME, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_request(TEXT, TEXT, DATE, DATE, TEXT, TIME, TIME, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION decide_request(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decide_request(UUID, TEXT, TEXT) TO authenticated;
