# Homeowner Guides publishing notes

Section: `/homeowner-guides/`

First article: `/homeowner-guides/gutter-repair-or-replacement-regina/`

Status: draft, awaiting the owner's selected photos. Do not merge this draft to the publishing branch until the photos are supplied and integrated. No stock or AI photos are authorized for these articles.

## Photos needed for the first article

1. A wide, clear photo of a completed gutter installation for the article opening, guide card and social preview.
2. A close-up of a gutter, downspout or fascia detail to support the inspection advice.
3. An optional before photo showing the issue. Use a before/after comparison only if the owner confirms both photos show the same project.

Ask for the city, work completed and the issue shown. Do not infer a job location, drainage outcome, gutter size, price or customer testimonial from a photo. Do not expose a customer's address in a caption.

The article contains two HTML comment markers for the supplied photos. Insert actual `<figure>` elements after inspecting the files, with factual alt text and captions. Create appropriately sized WebP copies, set width/height and responsive srcset. Load the first image eagerly and later images lazily. Add the chosen image to BlogPosting `image`, Open Graph and Twitter metadata; add image dimensions and alternative text. Article text currently stands on its own without broken image URLs or visible placeholders.

## Publication

- Check the final content with Abdul and integrate the supplied photos.
- Set the visible publication date, `datePublished`, `dateModified` and sitemap lastmod to the actual publication date.
- Keep exactly one H1, a unique title and description, self-referencing canonical, breadcrumb and BlogPosting JSON-LD.
- Recompute the inline JSON-LD CSP SHA-256 if the JSON-LD changes.
- Check mobile layout, all local links, contact actions, photo loading and consent controls.
- Merge and confirm GitHub Pages deployment, then inspect the live URLs.
- Request indexing in Search Console after publication. An indexing request does not guarantee inclusion or ranking.

## Future articles

Add each article under `/homeowner-guides/<descriptive-slug>/`. Add an index card, sitemap entry, suitable links from related service pages and links to relevant service/estimate pages. Use distinct homeowner questions rather than city-swapping duplicated text. Attribute the company as author unless a named person actually writes or reviews the piece. Never claim a human technical review before it occurs.

Use the user's photos for each article. Weekly automation creates drafts for review only; it does not publish articles. Prioritize Regina initially, with Calgary topics over time. Track queries, impressions, clicks and quote requests after publication.
