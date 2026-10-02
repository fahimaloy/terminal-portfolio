// src/utils/blogApi.ts
/* Client-side blog data access. Public reads go through /api/blogs,
   admin mutations through /api/admin/blogs (cookie-authenticated). */

import axios from 'axios';
import type {
  BlogPost,
  BlogListItem,
  BlogListResponse,
  BlogQuery,
  BlogUpsertInput,
} from '../types/blog';
import { getErrorMessage } from './errorMessage';

export interface BlogDetailResponse {
  post: BlogPost;
  prev: BlogListItem | null;
  next: BlogListItem | null;
  related: BlogListItem[];
}

/**
 * A response that succeeded and carried no rows. This is the ONE thing an
 * empty blog is allowed to look like — which is why the constant exists at all
 * and why it is never returned from a failure path (see `getBlogPosts`).
 */
const EMPTY_LIST: BlogListResponse = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 9,
  hasMore: false,
};

/* ── Public ──────────────────────────────────────────────────────────────── */

/**
 * Rejects when the request fails. Do not add a `catch` here.
 *
 * This used to swallow every error and return `EMPTY_LIST`, which made a
 * Supabase outage byte-for-byte identical to a blog with zero posts: the page
 * fell through to its "Nothing here yet" empty state and told every visitor
 * the site was simply unwritten. A failure and an absence are different facts,
 * and only the caller knows which one it can render. `EMPTY_LIST` now means
 * exactly what it says — a successful response with no rows.
 *
 * The rejection is the raw transport error, not a message: what to *call* a
 * given failure is a copy decision, and each surface owns its own. Callers
 * render it with `getErrorMessage(err, <their fallback>)`.
 */
export const getBlogPosts = async (
  query: BlogQuery = {},
): Promise<BlogListResponse> => {
  const res = await axios.get('/api/blogs', { params: query });
  return (res.data?.data as BlogListResponse) ?? EMPTY_LIST;
};

export const getBlogPost = async (
  slug: string,
): Promise<BlogDetailResponse | null> => {
  try {
    const res = await axios.get(`/api/blogs/${encodeURIComponent(slug)}`);
    return (res.data?.data as BlogDetailResponse) ?? null;
  } catch {
    return null;
  }
};

/**
 * Inherits `getBlogPosts`'s rejection by design: a featured strip that cannot
 * be filled is a fault, not an empty feature set, and the surface that renders
 * it needs to say so. No caller yet — this exists for the next one, and the
 * first caller must handle the rejection rather than assume a list.
 */
export const getFeaturedBlogPosts = async (
  limit = 3,
): Promise<BlogListItem[]> => {
  const list = await getBlogPosts({ featured: true, pageSize: limit });
  return list.items;
};

/* ── Admin ───────────────────────────────────────────────────────────────── */

export const adminListBlogs = async (): Promise<BlogPost[]> => {
  try {
    const res = await axios.get('/api/admin/blogs');
    return (res.data?.data as BlogPost[]) ?? [];
  } catch {
    return [];
  }
};

export const adminGetBlog = async (id: number): Promise<BlogPost | null> => {
  try {
    const res = await axios.get(`/api/admin/blogs/${id}`);
    return (res.data?.data as BlogPost) ?? null;
  } catch {
    return null;
  }
};

export const adminCreateBlog = async (
  input: BlogUpsertInput,
): Promise<{ ok: boolean; data?: BlogPost; message?: string }> => {
  try {
    const res = await axios.post('/api/admin/blogs', input);
    return { ok: true, data: res.data?.data as BlogPost };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, 'Failed to create post'),
    };
  }
};

export const adminUpdateBlog = async (
  id: number,
  input: BlogUpsertInput,
): Promise<{ ok: boolean; data?: BlogPost; message?: string }> => {
  try {
    const res = await axios.put(`/api/admin/blogs/${id}`, input);
    return { ok: true, data: res.data?.data as BlogPost };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, 'Failed to update post'),
    };
  }
};

export const adminDeleteBlog = async (
  id: number,
): Promise<{ ok: boolean; message?: string }> => {
  try {
    await axios.delete(`/api/admin/blogs/${id}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, 'Failed to delete post'),
    };
  }
};
