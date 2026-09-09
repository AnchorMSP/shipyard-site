import simpleGit, { SimpleGit } from 'simple-git'
import { Notice } from 'obsidian'

export class GitManager {
  private git: SimpleGit
  private repoPath: string
  private githubPAT: string

  constructor(repoPath: string, githubPAT: string = '') {
    this.repoPath = repoPath
    this.githubPAT = githubPAT
    this.git = simpleGit(repoPath)
  }

  async isRepoValid(): Promise<boolean> {
    try {
      const isRepo = await this.git.checkIsRepo()
      return isRepo
    } catch (error) {
      console.error('Git repo check failed:', error)
      return false
    }
  }

  async commitAndPush(message: string): Promise<void> {
    try {
      // Check if repo is valid
      const valid = await this.isRepoValid()
      if (!valid) {
        new Notice('Error: Invalid Git repository path')
        throw new Error('Invalid Git repository')
      }

      // Add all changes in content directory
      await this.git.add('content/*')
      await this.git.add('config/*')

      // Check if there are changes to commit
      const status = await this.git.status()
      if (status.files.length === 0) {
        console.log('No changes to commit')
        return
      }

      // Commit
      await this.git.commit(message)

      await this.pushWithAuth()

      new Notice('Published to Shipyard ✓')
    } catch (error) {
      console.error('Git operation failed:', error)

      // Retry once
      try {
        console.log('Retrying push...')
        await this.pushWithAuth()
        new Notice('Published to Shipyard ✓')
      } catch (retryError) {
        new Notice('Error: Failed to push to Git. Check console for details.')
        throw retryError
      }
    }
  }

  // Push using in-memory PAT auth for this invocation only. The remote's
  // configured URL is left untouched so the token never persists in .git/config.
  private async pushWithAuth(): Promise<void> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD'])
    const authUrl = await this.getAuthPushUrl()
    const push = authUrl
      ? this.git.push(authUrl, branch)
      : this.git.push()

    await Promise.race([
      push,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Push timeout')), 30000)
      ),
    ])
  }

  private async getAuthPushUrl(): Promise<string | undefined> {
    if (!this.githubPAT) return undefined

    const remotes = await this.git.getRemotes(true)
    const origin = remotes.find(r => r.name === 'origin')
    const match = origin?.refs.push?.match(/github\.com[:/](.+?)\.git/)
    if (!match) return undefined

    return `https://${this.githubPAT}@github.com/${match[1]}.git`
  }
}
