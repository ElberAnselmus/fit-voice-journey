import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CalendarPage = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchWorkouts();
    }
  }, [user]);

  useEffect(() => {
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      setSelectedDateWorkouts(dayWorkouts);
    }
  }, [date, workouts]);

  const fetchWorkouts = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  const getWorkoutDates = () => {
    return workouts.map(w => new Date(w.date));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-8 w-8" />
        <h1 className="text-3xl font-bold text-foreground">Workout Calendar</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              modifiers={{
                workout: getWorkoutDates(),
              }}
              modifiersStyles={{
                workout: { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }
              }}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Highlighted dates show your workout sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {date ? `Workouts on ${date.toLocaleDateString()}` : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateWorkouts.length > 0 ? (
              <div className="space-y-3">
                {selectedDateWorkouts.map((workout) => (
                  <div key={workout.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{workout.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {workout.duration_minutes} minutes
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <Badge variant="outline">{workout.total_sets} sets</Badge>
                        <p className="text-muted-foreground mt-1">{workout.total_reps} reps</p>
                      </div>
                    </div>
                    {workout.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{workout.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No workouts on this date</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;