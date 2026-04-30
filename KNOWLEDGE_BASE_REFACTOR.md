# Knowledge Base Refactoring

## Overview
Refactored the knowledge base system to have a unified structure where all knowledge bases are the same type (`knowledge`), but they can contain multiple sources of different types.

## New Architecture

### Single Knowledge Base Type
- **`knowledge`**: Universal knowledge base that can house multiple data sources
- **`vectorstore`**: External vector database connections (Chroma, Qdrant, Pinecone, etc.)

### Source Types (8 total)
Each source has its own configuration fields:

1. **Notes** (`notes`)
   - Fields: `content` (textarea)
   - Use: Personal notes and text snippets

2. **Files** (`files`)
   - Fields: `allowedTypes`, `maxFileSize`
   - Use: Upload PDF, DOC, TXT files

3. **URL** (`url`)
   - Fields: `url`, `crawlDepth`, `maxPages`, `respectRobots`, `followLinks`, `excludePatterns`
   - Use: Crawl web pages and articles

4. **Repository** (`repository`)
   - Fields: `repoUrl`, `branch`, `depth`, `filePatterns`, `excludePatterns`, `parseCode`, `accessToken`
   - Use: Clone and index Git repositories

5. **API** (`api`)
   - Fields: `name`, `apiEndpoint`, `method`, `authType`, `apiKey`, `headers`, `queryParams`, `refreshInterval`, `transformScript`
   - Use: Fetch data from REST APIs

6. **Directory** (`directory`)
   - Fields: `name`, `directoryPath`, `watchChanges`, `filePatterns`, `excludePatterns`, `recursive`
   - Use: Sync local directory files

7. **Service** (`service`)
   - Fields: `name`, `serviceType`, `accessToken`, `workspace`, `syncFrequency`, `includeArchived`
   - Use: Connect external services (Notion, Confluence, Jira, Slack, Discord, GitHub, GitLab, Linear, Trello)

8. **Workflow** (`workflow`)
   - Fields: `name`, `workflowType`, `schedule`, `inputSources`, `transformPipeline`, `outputDestination`, `notifyOnComplete`
   - Use: Automated data pipelines (ETL)

## UI Components

### `SourceConfigModal`
- Modal for configuring a new source when adding to a knowledge base
- Dynamically renders fields based on source type
- Validates required fields before adding

### `SettingsPanel`
- Unified settings for the knowledge base
- RAG settings: retrieval_mode, hybrid_search, reranking, chunk_size, chunk_overlap
- Chat settings: kb_chat_enabled, chat_model, temperature, max_context_chunks

### Knowledge Base Card
- Shows KB type label
- Displays number of sources if any
- Shows file count, tokens, chunks

## Backend Changes

### `knowledge.py`
```python
kb_type: Literal["knowledge", "vectorstore"] = "knowledge"
```

### Migration
Old types (`text`, `files`, `web`, `api`, `notes`, `document`) are automatically converted to `knowledge` type.

## Data Structure

### Knowledge Base Schema
```typescript
{
  id: string
  name: string
  description: string
  kb_type: "knowledge" | "vectorstore"
  retrieval_mode: "focused" | "full"
  hybrid_search: boolean
  reranking: boolean
  chunk_size: number
  chunk_overlap: number
  files: KBFile[]  // Legacy - uploaded files
  config: {
    sources?: Source[]  // NEW: array of configured sources
    // ... other config fields
  }
}
```

### Source Schema
```typescript
{
  id: string
  type: SourceType  // notes | files | url | repository | api | directory | service | workflow
  config: {
    // type-specific fields
  }
  created_at: number
  status?: 'active' | 'syncing' | 'error'
  last_synced?: number
}
```

## Next Steps (Future Implementation)

1. **Source Management UI**
   - Add/Remove sources from a knowledge base
   - View all sources with their status
   - Edit source configuration
   - Sync/refresh individual sources

2. **Source Processing**
   - Implement processors for each source type
   - URL: Web crawler with configurable depth
   - Repository: Git clone with branch selection
   - API: Scheduled fetch with transform scripts
   - Directory: File watcher for auto-sync
   - Service: OAuth integration for each provider
   - Workflow: DAG-based execution engine

3. **Source Status**
   - Show sync status for each source
   - Display last sync time
   - Show error messages if sync failed
   - Manual retry for failed sources

4. **Source-specific Components**
   - `NotesEditor`: Rich text editor for notes
   - `FilesUploader`: Drag & drop file upload
   - `UrlCrawler`: URL input with crawl settings
   - `RepoConnector`: Git repo connection form
   - `ApiConnector`: API endpoint configuration
   - `DirectoryWatcher`: Local directory picker
   - `ServiceConnector`: Service selection + OAuth
   - `WorkflowBuilder`: Visual workflow editor

## Benefits

1. **Flexibility**: One KB can contain multiple source types
2. **Modularity**: Each source type is independent and configurable
3. **Extensibility**: Easy to add new source types
4. **User-Friendly**: Clear separation between KB settings and source config
5. **Scalability**: Sources can be processed independently