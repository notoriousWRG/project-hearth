export type UserType = 'parent' | 'child';
export type RecurrenceRule = 'daily' | 'weekly';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type GroceryCategory = 'produce' | 'protein' | 'pantry' | 'dairy' | 'household' | 'other';
export type GrocerySource = 'manual' | 'meal_plan';

export interface User {
  id: number;
  name: string;
  type: UserType;
  icon: string;
  display_order: number;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  position: number;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  created_at: string;
  completed_at: string | null;
}

export interface Chore {
  id: number;
  user_id: number;
  title: string;
  icon: string;
  completed: boolean;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  is_bonus: boolean;
  bonus_amount: number | null;
  position: number;
  created_at: string;
  completed_at: string | null;
}

export interface ChoreCompletion {
  id: number;
  chore_id: number;
  completed_at: string;
  period_id: string;
}

export interface AllowanceConfig {
  id: number;
  user_id: number;
  amount: number;
  streak_threshold: number;
  reset_day: number;
  period_start: string;
}

export interface AllowanceTier {
  id: number;
  config_id: number;
  percent_complete: number;
  percent_payout: number;
}

export interface StreakRecord {
  id: number;
  user_id: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

export interface MealPlanEntry {
  id: number;
  week_start_date: string;
  day_of_week: DayOfWeek;
  meal_type: MealType;
  description: string;
}

export interface GroceryItem {
  id: number;
  name: string;
  category: GroceryCategory;
  checked: boolean;
  source: GrocerySource;
  meal_plan_id: number | null;
}

export interface Reminder {
  id: number;
  title: string;
  due_date: string;
  dismissed: boolean;
  created_at: string;
}

export type NewUser = Omit<User, 'id'>;
export type NewTodo = Omit<Todo, 'id' | 'created_at' | 'completed_at'>;
export type NewChore = Omit<Chore, 'id' | 'created_at' | 'completed_at'>;
export type NewMealPlanEntry = Omit<MealPlanEntry, 'id'>;
export type NewGroceryItem = Omit<GroceryItem, 'id'>;
export type NewReminder = Omit<Reminder, 'id' | 'created_at' | 'dismissed'>;
