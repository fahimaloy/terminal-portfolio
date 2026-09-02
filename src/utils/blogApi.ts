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

const EMPTY_LIST: BlogListResponse = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 9,
  hasMore: false,
};

/* ── Public ──────────────────────────────────────────────────────────────── */

export const getBlogPosts = async (
  query: BlogQuery = {},
): Promise<BlogListResponse> => {
  try {
    const res = await axios.get('/api/blogs', { params: query });
    return (res.data?.data as BlogListResponse) ?? EMPTY_LIST;
  } catch {
    return EMPTY_LIST;
  }
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
