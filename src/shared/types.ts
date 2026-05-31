export type UserType = 'parent' | 'child';
export type RecurrenceRule = 'daily' | 'weekly';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type GroceryCategory = 'produce' | 'protein' | 'pantry' | 'dairy' | 'household' | 'other';
export type GrocerySource = 'manual' | 'meal_plan';
export type InventoryLocation = 'pantry' | 'icebox';

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
  recurrence_days: DayOfWeek[] | null;
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
  savings_balance: number;
  tithe_balance: number;
  checking_balance: number;
}

export interface BankingData {
  thisWeekEarned: number;
  todayEarned: number;
  savingsBalance: number;
  titheBalance: number;
  checkingBalance: number;
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

export interface MealIngredient {
  id: number;
  meal_id: number;
  name: string;
  category: GroceryCategory;
  position: number;
}

export interface Meal {
  id: number;
  name: string;
  created_at: string;
  ingredients: MealIngredient[];
}

export interface InventoryItem {
  id: number;
  name: string;
  category: GroceryCategory;
  location: InventoryLocation;
  notes: string;
}

export interface MealPlanEntry {
  id: number;
  week_start_date: string;
  day_of_week: DayOfWeek;
  meal_type: MealType;
  description: string;
  meal_id: number | null;
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
export type NewMeal = Pick<Meal, 'name'>;
export type NewMealIngredient = Omit<MealIngredient, 'id' | 'meal_id'>;
export type NewInventoryItem = Omit<InventoryItem, 'id'>;

export interface ChoreHistoryEntry {
  choreId: number;
  title: string;
  icon: string;
  completed: boolean;
  isBonus: boolean;
  bonusAmount: number | null;
}

export interface ChoreHistoryDay {
  date: string;
  chores: ChoreHistoryEntry[];
  earned: number;
}

export interface ChoreHistoryToggleResult {
  completed: boolean;
  earned: number;
}

export interface QuickActionChore {
  id: number;
  title: string;
  icon: string;
}

export interface ChildSummary {
  id: number;
  name: string;
  icon: string;
  total: number;
  completed: number;
  percent: number;
  earned: number;
  streak: number;
  nextChores: QuickActionChore[];
}

export interface TodayMeals {
  breakfast: string;
  lunch: string;
  dinner: string;
  snack: string;
}

export interface SummaryResponse {
  children: ChildSummary[];
  reminders: Reminder[];
  meals: TodayMeals;
  affirmation: string;
}

export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent';

export interface MoonPhaseInfo {
  name: MoonPhaseName;
  emoji: string;
  fraction: number;
}
