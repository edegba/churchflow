CREATE POLICY "church members view their logo"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'church-logos'
  AND public.is_org_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "church admins upload logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'church-logos'
  AND public.is_org_admin(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "church admins update logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'church-logos'
  AND public.is_org_admin(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'church-logos'
  AND public.is_org_admin(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "church admins delete logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'church-logos'
  AND public.is_org_admin(((storage.foldername(name))[1])::uuid)
);
