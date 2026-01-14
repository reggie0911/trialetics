'use server';

import { createClient } from '@/lib/server';
import { Todo, TodoFormData } from '@/lib/types/todo';
import { revalidatePath } from 'next/cache';

export async function getTodos(projectId: string): Promise<{ data: Todo[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching todos:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Todo[], error: null };
  } catch (error) {
    console.error('Error in getTodos:', error);
    return { data: null, error: 'Failed to fetch todos' };
  }
}

export async function createTodo(
  formData: TodoFormData,
  projectId: string
): Promise<{ data: Todo | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        project_id: projectId,
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date || null,
        tags: formData.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating todo:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/protected/dashboard');
    return { data: data as Todo, error: null };
  } catch (error) {
    console.error('Error in createTodo:', error);
    return { data: null, error: 'Failed to create todo' };
  }
}

export async function updateTodo(
  id: string,
  formData: Partial<TodoFormData>
): Promise<{ data: Todo | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const updateData: any = {};
    if (formData.title !== undefined) updateData.title = formData.title;
    if (formData.description !== undefined) updateData.description = formData.description || null;
    if (formData.due_date !== undefined) updateData.due_date = formData.due_date || null;
    if (formData.tags !== undefined) updateData.tags = formData.tags;

    const { data, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating todo:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/protected/dashboard');
    return { data: data as Todo, error: null };
  } catch (error) {
    console.error('Error in updateTodo:', error);
    return { data: null, error: 'Failed to update todo' };
  }
}

export async function toggleTodoComplete(
  id: string,
  completed: boolean
): Promise<{ data: Todo | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('todos')
      .update({ completed })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling todo:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/protected/dashboard');
    return { data: data as Todo, error: null };
  } catch (error) {
    console.error('Error in toggleTodoComplete:', error);
    return { data: null, error: 'Failed to toggle todo' };
  }
}

export async function deleteTodo(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting todo:', error);
      return { error: error.message };
    }

    revalidatePath('/protected/dashboard');
    return { error: null };
  } catch (error) {
    console.error('Error in deleteTodo:', error);
    return { error: 'Failed to delete todo' };
  }
}
