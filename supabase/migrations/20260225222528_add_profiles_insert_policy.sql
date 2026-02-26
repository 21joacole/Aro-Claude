/*
  # Add INSERT policy for profiles table

  1. Changes
    - Add INSERT policy to allow users to create their own profile on first sign-in
  
  2. Security
    - Users can only insert a profile with their own auth.uid()
*/

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
