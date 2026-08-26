CREATE POLICY "creators can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (created_by = auth.uid());