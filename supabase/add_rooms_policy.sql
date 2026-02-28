-- Allow authenticated users to create new rooms/channels
CREATE POLICY "Authenticated users can insert rooms." ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Optional: If you want to insert a default room immediately
-- INSERT INTO public.rooms (name) VALUES ('General Chat');
