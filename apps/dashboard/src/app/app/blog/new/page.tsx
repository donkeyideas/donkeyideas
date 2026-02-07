'use client';

import BlogEditor from '@/components/blog/blog-editor';

export default function NewBlogPostPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <BlogEditor mode="create" />
    </div>
  );
}
