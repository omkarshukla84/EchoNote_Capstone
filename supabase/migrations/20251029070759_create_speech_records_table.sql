/*
  # Create speech records table

  1. New Tables
    - `speech_records`
      - `id` (uuid, primary key) - Unique identifier for each record
      - `transcript` (text) - The speech-to-text transcript
      - `gemini_response` (text) - The AI analysis response from Gemini
      - `created_at` (timestamptz) - Timestamp when the record was created
  
  2. Security
    - Enable RLS on `speech_records` table
    - Add policy for public insert (anyone can create records)
    - Add policy for public read (anyone can view records)
    
  Note: Using public access for this demo. In production, you should restrict access to authenticated users only.
*/

CREATE TABLE IF NOT EXISTS speech_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript text NOT NULL,
  gemini_response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE speech_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert speech records"
  ON speech_records
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view speech records"
  ON speech_records
  FOR SELECT
  TO anon
  USING (true);
