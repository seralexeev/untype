import z from 'zod';

export const todoStatuses = ['CREATED', 'COMPLETED', 'CANCELLED'] as const;
export const TodoStatusSchema = z.enum(todoStatuses);
export type TodoStatus = z.infer<typeof TodoStatusSchema>;
