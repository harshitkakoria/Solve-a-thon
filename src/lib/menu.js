import { supabase } from './supabase'

/**
 * Fetches the active menu from Supabase for a given mess ID.
 * If no active menu is found, it falls back to parsing the most recently created menu.
 * 
 * @param {string} messId - The ID of the current mess
 * @returns {Promise<Object|null>} The menu JSON object, or null if absolutely nothing exists or an error occurs.
 */
export async function fetchActiveMenu(messId) {
  if (!messId) return null

  try {
    // 1. Attempt to fetch the actively marked menu
    const { data: activeMenuData, error: activeError } = await supabase
      .from('menus')
      .select('menu_data')
      .eq('mess_id', messId)
      .eq('is_active', true)
      .limit(1)

    if (activeError) throw activeError

    if (activeMenuData && activeMenuData.length > 0) {
      return activeMenuData[0].menu_data
    }

    // 2. Fallback: If no explicit active menu is found, fetch the latest menu based on creation time
    const { data: latestMenuData, error: latestError } = await supabase
      .from('menus')
      .select('menu_data')
      .eq('mess_id', messId)
      .order('created_at', { ascending: false }) // ensure latest is grabbed
      .limit(1)

    if (latestError) throw latestError

    if (latestMenuData && latestMenuData.length > 0) {
      return latestMenuData[0].menu_data
    }

    // 3. Complete fallback: If no menus exist for this mess at all
    return null

  } catch (error) {
    console.error('Failed to fetch active menu from Supabase:', error)
    return null
  }
}
