import fs from 'fs'
import path from 'path'

export interface SiteConfig {
  backgroundMediaUrl: string
}

export function getSiteConfig(): SiteConfig {
  const configPath = path.join(process.cwd(), 'config', 'site.json')

  let configFile: string
  try {
    configFile = fs.readFileSync(configPath, 'utf8')
  } catch (error) {
    // A missing config file is the only case that may fall back to defaults; a read
    // failure must not silently drop the site's hero background.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        backgroundMediaUrl: '',
      }
    }
    throw error
  }

  try {
    return JSON.parse(configFile) as SiteConfig
  } catch (error) {
    throw new Error(`Invalid site config at ${configPath}: ${(error as Error).message}`)
  }
}
