import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function injectBadFeedback() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  console.log("Inserting for date:", yesterday.toISOString())

  const { data, error } = await supabase
    .from('feedback')
    .insert([
      {
        mess_id: 'Test-Mess-01', // Ensure this matches their current ID or we just leave it generic
        meal_slot: 'Dinner',
        rating: 1,
        complaint_tags: ['Hygiene', 'Quality'],
        complaint_text: 'I found a bug in the soup, and the bread was extremely stale.',
        ai_severity: 3,
        created_at: yesterday.toISOString(), 
      }
    ])
    .select()

  if (error) console.error("Error:", error)
  else console.log("Success:", data)
}

injectBadFeedback()
