/**
 * Note type templates and default values
 * Each template provides a structured starting point for different use cases
 */

export const NOTE_TEMPLATES = {
  rich: {
    title: 'New Note',
    content: `# Title

## Overview
Brief description of this note...

## Key Points
- Point 1
- Point 2
- Point 3

## Details

## Summary
`,
    tags: [],
  },

  simple: {
    title: 'Quick Note',
    content: '',
    tags: [],
  },

  voice: {
    title: 'Voice Memo',
    content: `# Voice Memo

**Recorded**: ${new Date().toLocaleDateString()}

## Transcription

## Key Points
- 

## Action Items
- [ ] 

## Notes
`,
    tags: ['voice-memo'],
  },

  meeting: {
    title: 'Meeting Notes',
    content: `# 🎙️ Meeting: 

**📅 Date**: ${new Date().toLocaleDateString()}
**🕐 Start Time**: 
**🕐 End Time**: 
**📍 Location/Call**: 
**👥 Attendees**: 
**❌ Absent**: 

---

## 📋 Pre-Meeting Planning

### 🎯 Meeting Objectives
What should be accomplished by the end of this meeting?

### 👔 Chairperson/Moderator
Designated leader to keep discussions on track:

### ⏱️ Time-Backed Agenda
| # | Agenda Item | Presenter | Time Allocated | Status |
|---|-------------|-----------|----------------|--------|
| 1 |             |           |                | ⬜     |
| 2 |             |           |                | ⬜     |
| 3 |             |           |                | ⬜     |
| 4 |             |           |                | ⬜     |

### 🏷️ Required Preparation
- [ ] 
- [ ] 

### 📝 Parking Lot
Capture off-topic ideas here to revisit later:
-

---

## 📋 Meeting Minutes

### ✅ Approval of Previous Minutes
*Previous meeting record reviewed and accepted:*
- [ ] Approved as written
- [ ] Approved with changes

### 🏛️ Defined Roles
| Role | Person | Responsibility |
|------|--------|----------------|
| Chairperson |        | Keeps discussion on track |
| Note-taker |        | Documents discussions & decisions |
| Timekeeper |        | Monitors agenda timing |
| Attendees |        | Active participation |

### 📚 Attendance Log
| Name | Role | Present |
|------|------|---------|
|      |      | ⬜     |
|      |      | ⬜     |
|      |      | ⬜     |

---

## 💬 Discussion Summary

### Topic 1: 
**Key Points Discussed:**
- 

**Decisions Made:**
- 

**Action Items:**
- [ ] 

### Topic 2: 
**Key Points Discussed:**
- 

**Decisions Made:**
- 

**Action Items:**
- [ ] 

### Topic 3: 
**Key Points Discussed:**
- 

**Decisions Made:**
- 

**Action Items:**
- [ ] 

---

## 📌 Decisions & Motions

| Motion | Proposed By | Seconded | Result | Notes |
|--------|-------------|----------|--------|-------|
|        |             |          | ⬜Passed / ⬜Tabled |        |

---

## ✅ Action Plan Table

| # | Action Item | Owner | Due Date | Priority | Status |
|---|-------------|-------|----------|----------|--------|
| 1 |             |       |          | 🔴 High  | ⬜     |
| 2 |             |       |          | 🟡 Medium| ⬜     |
| 3 |             |       |          | 🟢 Low  | ⬜     |

---

## 🅿️ Parking Lot (Off-Topic Items)
| Item | Raised By | Follow-up |
|------|----------|----------|
|      |          | ⬜       |

---

## 🔜 Follow-up & Next Steps
- [ ] 
- [ ] 

---

## 📎 Attachments / References
-

---
*Meeting Minutes by CIO Intelligence Hub*`,
    tags: ['meeting'],
  },

  research: {
    title: 'Research: ',
    content: `# Research: 

**Date Started**: ${new Date().toLocaleDateString()}
**Status**: 🟡 In Progress

## 🎯 Objective
What I'm trying to find out or understand...

## 📚 Sources
- [Source 1]()
- [Source 2]()

## 📝 Key Findings

### Finding 1
-

### Finding 2
-

## 💡 Insights
- 

## ❓ Questions
- [ ] Question 1
- [ ] Question 2

## 📖 Notes

## ✅ Conclusions
- 

## 🔗 Related
`,
    tags: ['research'],
  },

  project: {
    title: 'Project: ',
    content: `# Project: 

**Status**: 🚧 Planning
**Start Date**: 
**Target Completion**: 

## 🎯 Project Goal
What success looks like...

## 👥 Team
| Role | Name | Responsibility |
|------|------|----------------|
| Lead |      |                |
|      |      |                |

## 📊 Milestones
- [ ] Milestone 1 - 
- [ ] Milestone 2 - 
- [ ] Milestone 3 - 

## 📋 Tasks

### Phase 1: Planning
- [ ] Task 1
- [ ] Task 2

### Phase 2: Execution
- [ ] Task 3
- [ ] Task 4

### Phase 3: Delivery
- [ ] Task 5

## 💰 Budget
| Item | Estimated | Actual |
|------|----------|--------|
|      |          |        |

## ⚠️ Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
|      |        |            |

## 📄 Documents
-

## 🏁 Progress Log
**${new Date().toLocaleDateString()}**: 
`,
    tags: ['project'],
  },

  daily: {
    title: `Daily Note: ${new Date().toLocaleDateString()}`,
    content: `# ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

## 🌅 Morning Intentions
- 

## ☕ End of Day Review

### ✅ What I Accomplished
- 

### 📚 What I Learned
- 

### 🎯 Tomorrow's Priorities
1. 
2. 

## 💭 Reflections
- 

## ⏱️ Time Tracking
| Time | Activity |
|------|----------|
|      |          |

## 📝 Notes
`,
    tags: ['journal', 'daily'],
  },

  documentation: {
    title: 'Documentation: ',
    content: `# Documentation: 

**Version**: 1.0.0
**Last Updated**: ${new Date().toLocaleDateString()}
**Status**: 📝 Draft

---

## Overview
Brief description of what this document covers...

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Usage](#usage)
4. [Configuration](#configuration)
5. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites
- 
- 

### Installation
\`\`\`bash
# Add installation commands
\`\`\`

## Usage

### Basic Example
\`\`\`javascript
// Add code example
\`\`\`

### Advanced Usage

## Configuration
| Option | Default | Description |
|--------|---------|-------------|
|        |         |             |

## Troubleshooting
| Issue | Solution |
|-------|----------|
|       |          |

## FAQ
**Q:**
**A:**

## Changelog
| Version | Changes |
|---------|---------|
| 1.0.0   | Initial release |
`,
    tags: ['documentation', 'technical'],
  },

  bug: {
    title: 'Bug: ',
    content: `# Bug Report: 

**Reported**: ${new Date().toLocaleDateString()}
**Severity**: 🟡 Medium
**Status**: 🔴 Open

## Summary
Brief one-line description...

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
What should happen...

## Actual Behavior
What actually happens...

## 🖥️ Environment
- OS: 
- Browser/Version: 
- App Version: 

## 📸 Screenshots/Logs
\`\`\`
[Add error logs or screenshots]
\`\`\`

## 🔍 Investigation
What I've found so far...

## 💡 Suggested Fix
- 

## Related Issues
- 
`,
    tags: ['bug', 'issue'],
  },

  feature: {
    title: 'Feature Request: ',
    content: `# Feature Request: 

**Submitted**: ${new Date().toLocaleDateString()}
**Status**: 💡 Under Review
**Priority**: 

##概述
One-paragraph summary of the requested feature...

## 🎯 Problem Statement
What problem does this solve?

## 💡 Proposed Solution
How should it work?

## 👤 User Story
As a [type of user], I want [goal] so that [benefit].

## 📊 Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| F1 |             | Must have |
| F2 |             | Should have |

## 🎨 Mockups/Design Ideas
[Add design references or links]

## ✅ Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## 💬 Comments
`,
    tags: ['feature', 'request'],
  },

  recipe: {
    title: 'Recipe: ',
    content: `# Recipe: 

**Prep Time**: 
**Cook Time**: 
**Servings**: 
**Difficulty**: ⭐⭐⭐

## 📝 Description
Brief description of the dish...

## 🛒 Ingredients

### Main
- [ ] 
- [ ] 

### Seasonings
- [ ] 
- [ ] 

## 👨‍🍳 Instructions

### Prep
1. 

### Cook
1. 
2. 
3. 

## 🍽️ Serving
- 

## 💡 Chef's Tips
- 

## 📊 Nutrition (per serving)
| | |
|---|---|
| Calories | |
| Protein | |
| Carbs | |
| Fat | |
`,
    tags: ['recipe', 'cooking'],
  },

  book: {
    title: 'Book Notes: ',
    content: `# Book Notes: 

**Title**: 
**Author**: 
**Start Date**: 
**End Date**: 

## ⭐ Rating
[ ]⭐☆☆☆ [ ]⭐⭐☆☆ [ ]⭐⭐⭐☆☆ [ ]⭐⭐⭐⭐☆ [ ]⭐⭐⭐⭐⭐

## 📖 Summary
Brief summary of the book...

## 🎯 Main Takeaways

### 1. 
### 2. 
### 3. 

## 📚 Key Concepts

### Chapter/Term 1
Notes...

### Chapter/Term 2
Notes...

## 💬 Favorite Quotes
> ""

## 🔄 How I'll Apply This
- 

## 📝 Chapter Notes

### Chapter 1: 
-

### Chapter 2: 
-

## 🔗 Related Books/Resources
`,
    tags: ['book-notes', 'reading'],
  },
}

export const NOTE_TYPE_INFO = {
  rich: {
    label: 'Rich Note',
    description: 'Full-featured markdown with formatting, code blocks, and styling',
    icon: 'EditIcon',
    color: '#6366f1',
    examples: ['Research', 'Documentation', 'Blog posts'],
  },

  simple: {
    label: 'Simple Note',
    description: 'Clean, distraction-free plain text format',
    icon: 'FileTextIcon',
    color: '#a855f7',
    examples: ['Quick thoughts', 'To-do lists', 'Snippets'],
  },

  voice: {
    label: 'Voice Note',
    description: 'Record audio and get automatic transcription',
    icon: 'MicIcon',
    color: '#10b981',
    examples: ['Ideas on the go', 'Reminders', 'Voice memos'],
  },

  meeting: {
    label: 'Meeting Note',
    description: 'Structured format for participants, agenda, and action items',
    icon: 'UsersIcon',
    color: '#ec4899',
    examples: ['Team meetings', 'One-on-ones', 'Planning sessions'],
  },

  research: {
    label: 'Research',
    description: 'Track sources, findings, and insights for investigations',
    icon: 'SearchIcon',
    color: '#f59e0b',
    examples: ['Market research', 'Competitive analysis', 'Learning'],
  },

  project: {
    label: 'Project',
    description: 'Track milestones, tasks, and progress for initiatives',
    icon: 'LayersIcon',
    color: '#8b5cf6',
    examples: ['Product launches', 'Events', 'Initiatives'],
  },

  daily: {
    label: 'Daily Journal',
    description: 'Morning intentions and end-of-day reflections',
    icon: 'CalendarIcon',
    color: '#06b6d4',
    examples: ['Habits', 'Personal growth', 'Daily tracking'],
  },

  documentation: {
    label: 'Documentation',
    description: 'Technical docs with installation, usage, and troubleshooting',
    icon: 'FileTextIcon',
    color: '#64748b',
    examples: ['APIs', 'Guides', 'Runbooks'],
  },

  bug: {
    label: 'Bug Report',
    description: 'Structured format for tracking issues and investigation',
    icon: 'BugIcon',
    color: '#ef4444',
    examples: ['Debugging', 'Issue tracking', 'QA'],
  },

  feature: {
    label: 'Feature Request',
    description: 'Document ideas with requirements and acceptance criteria',
    icon: 'SparklesIcon',
    color: '#22c55e',
    examples: ['Product feedback', 'Ideas', 'Enhancements'],
  },

  recipe: {
    label: 'Recipe',
    description: 'Track ingredients, instructions, and cooking tips',
    icon: 'FileTextIcon',
    color: '#f97316',
    examples: ['Cooking', 'Meal planning', 'Food'],
  },

  book: {
    label: 'Book Notes',
    description: 'Capture takeaways, quotes, and personal reflections',
    icon: 'BookIcon',
    color: '#3b82f6',
    examples: ['Reading', 'Learning', 'Summaries'],
  },
}

export const getTemplateForType = (type) => {
  return NOTE_TEMPLATES[type] || NOTE_TEMPLATES.rich
}

export const getTypeInfo = (type) => {
  return NOTE_TYPE_INFO[type] || NOTE_TYPE_INFO.rich
}
