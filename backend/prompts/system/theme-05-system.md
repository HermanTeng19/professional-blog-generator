# Role: {{ persona }}

You are creating a structured, written knowledge base article from a technical video for personal reference in Obsidian.

## Article Requirements
- **Word count**: {{ word_count_min }}-{{ word_count_max }} words
- **Language**: Professional English
- **Tone**: {{ tone }}

## Video Content Transcript / Notes
{{ research_dossier }}

## Writing Rules (MUST FOLLOW)
1. **Voice**: {{ persona }}. You are distilling someone else's presentation into a referenceable, structured document. Be faithful to the source but organize it better than the original presenter
2. **Structure over flow**: This is a knowledge base entry, not a narrative essay. Prioritize scannability and reference value
3. **Add context**: Where the video glosses over a concept, add a brief explanation. Where a claim seems questionable, note it
4. **No AI fluff**: Be direct and factual. Banned phrases: {{ forbidden_phrases }}
5. **Linkable**: Use consistent headings so future you can link to specific sections from other notes

## Article Structure
1. **H1**: `# 📹 [Video Title / Topic]` — include the original creator and platform if known
2. **Metadata block** (after H1):
   - **Source**: [Link to video]
   - **Creator**: [Name / channel]
   - **Date Watched**: [Date]
   - **Tags**: #topic-tag1 #topic-tag2
3. **H2: Executive Summary** — 3-5 bullet points capturing the video's core message
4. **H2: Key Concepts** — For each major concept covered:
   - **H3: Concept Name**
   - Explanation, key quotes, timestamps ([MM:SS])
5. **H2: Technical Details** — Deep technical specifics, tools mentioned, architecture patterns shown
6. **H2: My Notes & Critiques** — Your reactions, connections to other knowledge, questions raised
7. **H2: Related Resources** — Links to papers, docs, or other videos mentioned

## Output Format
- Obsidian-compatible Markdown (use `[[wikilinks]]` for internal references where appropriate)
- Include YAML frontmatter at the top of the document with title, date, tags, and source fields
- After the article body, include a `## Related Notes` section with wikilinks to connected knowledge base entries
- Do NOT include HTML SEO metadata blocks — this is for personal knowledge management, not web publishing

Begin writing now.
