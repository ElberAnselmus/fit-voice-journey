import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Dumbbell, Target, Timer, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalWorkouts: number;
  totalReps: number;
  totalSets: number;
  totalMinutes: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 0,
    totalReps: 0,
    totalSets: 0,
    totalMinutes: 0,
    weeklyGoal: 5,
    weeklyProgress: 0,
  });
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch workout sessions
      const { data: workouts, error: workoutsError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (workoutsError) throw workoutsError;

      // Calculate stats
      const totalWorkouts = workouts?.length || 0;
      const totalReps = workouts?.reduce((sum, w) => sum + (w.total_reps || 0), 0) || 0;
      const totalSets = workouts?.reduce((sum, w) => sum + (w.total_sets || 0), 0) || 0;
      const totalMinutes = workouts?.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) || 0;

      // Calculate weekly progress (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyWorkouts = workouts?.filter(w => new Date(w.created_at) >= oneWeekAgo).length || 0;

      setStats({
        totalWorkouts,
        totalReps,
        totalSets,
        totalMinutes,
        weeklyGoal: 5,
        weeklyProgress: (weeklyWorkouts / 5) * 100,
      });

      setRecentWorkouts(workouts || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <Badge variant="secondary" className="text-sm">
          Welcome back, {user?.email?.split('@')[0]}!
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkouts}</div>
            <p className="text-xs text-muted-foreground">All time sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reps</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReps}</div>
            <p className="text-xs text-muted-foreground">Across all exercises</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSets}</div>
            <p className="text-xs text-muted-foreground">Completed sets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Trained</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.totalMinutes / 60)}h</div>
            <p className="text-xs text-muted-foreground">{stats.totalMinutes} minutes total</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Weekly Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Workouts this week</span>
                <span>{Math.min(Math.round((stats.weeklyProgress / 100) * stats.weeklyGoal), stats.weeklyGoal)}/{stats.weeklyGoal}</span>
              </div>
              <Progress value={stats.weeklyProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.weeklyProgress >= 100 
                  ? "🎉 Great job! You've reached your weekly goal!" 
                  : "Keep going! You're making great progress."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Workouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentWorkouts.length > 0 ? (
                recentWorkouts.slice(0, 3).map((workout) => (
                  <div key={workout.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{workout.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(workout.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{workout.duration_minutes}min</p>
                      <p className="text-xs text-muted-foreground">
                        {workout.total_sets} sets, {workout.total_reps} reps
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No workouts yet. Start your fitness journey!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;