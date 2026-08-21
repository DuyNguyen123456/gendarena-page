-- Migration: Support for Admin Judge Invitations
-- Additive only: ensures admin policies for managing judge profiles

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Admins can manage all profiles'
  ) THEN
    CREATE POLICY "Admins can manage all profiles" ON profiles
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles admin_p
          WHERE admin_p.id = auth.uid() AND admin_p.role = 'admin'
        )
      );
  END IF;
END $$;
