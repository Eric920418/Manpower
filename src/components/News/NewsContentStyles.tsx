"use client";

export function NewsContentStyles() {
  return (
    <style jsx global>{`
      .news-content h1 {
        font-size: 2rem;
        font-weight: 700;
        margin-top: 2rem;
        margin-bottom: 1rem;
        color: #1a1a1a;
      }
      .news-content h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
        color: #2a2a2a;
      }
      .news-content h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-top: 1.25rem;
        margin-bottom: 0.5rem;
        color: #3a3a3a;
      }
      .news-content p {
        margin-bottom: 1rem;
        line-height: 1.8;
        color: #4a4a4a;
      }
      .news-content ul, .news-content ol {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
      }
      .news-content li {
        margin-bottom: 0.5rem;
        line-height: 1.7;
      }
      .news-content blockquote {
        border-left: 4px solid #e5e5e5;
        padding-left: 1rem;
        margin: 1.5rem 0;
        font-style: italic;
        color: #666;
      }
      .news-content img {
        max-width: 100%;
        height: auto;
        border-radius: 0.5rem;
        margin: 1.5rem 0;
      }
      .news-content a {
        color: var(--brand-primary, #3b82f6);
        text-decoration: underline;
      }
      .news-content a:hover {
        text-decoration: none;
      }
      .news-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.5rem 0;
      }
      .news-content th, .news-content td {
        border: 1px solid #e5e5e5;
        padding: 0.75rem;
        text-align: left;
      }
      .news-content th {
        background-color: #f5f5f5;
        font-weight: 600;
      }
    `}</style>
  );
}
