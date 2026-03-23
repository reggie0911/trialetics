'use server';

import { revalidatePath } from 'next/cache';
import { materializeEisfRulesForFolder } from '@/lib/actions/eisf';

export async function materializeEisfFolderAction(folderId: string, _formData: FormData) {
  await materializeEisfRulesForFolder(folderId);
  revalidatePath(`/protected/eisf/folders/${folderId}`);
}
