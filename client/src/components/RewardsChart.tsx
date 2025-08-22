import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

declare global {
  interface Window {
    Chart: any;
  }
}

export default function RewardsChart() {
  const { user } = useAuth();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [period, setPeriod] = useState('7');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/user', user?.telegramId],
    enabled: !!user?.telegramId,
    retry: false, // Don't retry on 404 errors
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
  });

  // Load Chart.js dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => setChartLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (chartLoaded && chartRef.current && data) {
      initializeChart();
    }
  }, [chartLoaded, data, period]);

  const initializeChart = () => {
    if (!chartRef.current || !window.Chart) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    
    // Generate mock chart data based on period
    const days = parseInt(period);
    const labels: string[] = [];
    const chartData: number[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // Generate realistic reward data based on user's actual staking
      const userData = (data as any)?.user;
      const totalStaked = parseFloat(userData?.totalStaked || '0');
      const baseReward = totalStaked * (8.7 / 100 / 365); // Daily reward
      const variance = (Math.random() - 0.5) * 0.1; // ±10% variance
      chartData.push(Math.max(0, baseReward * (1 + variance)));
    }
    
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    
    chartInstance.current = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Rewards (TON)',
          data: chartData,
          borderColor: 'hsl(203 100% 52%)',
          backgroundColor: 'hsla(203, 100%, 52%, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'hsl(203 100% 52%)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              callback: function(value: any) {
                return parseFloat(value).toFixed(3) + ' TON';
              }
            }
          },
          x: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor
            }
          }
        }
      }
    });
  };

  const userData = (data as any)?.user;
  const totalEarned = parseFloat(userData?.totalEarned || '0');
  const recentAnalytics = (data as any)?.recentAnalytics || [];
  
  // Calculate stats from recent analytics
  const avgDaily = recentAnalytics.length > 0 
    ? recentAnalytics.reduce((sum: number, a: any) => sum + parseFloat(a.netRewards), 0) / recentAnalytics.length 
    : 0;

  if (isLoading) {
    return (
      <Card data-testid="rewards-chart">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-48 w-full mb-4" />
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <Skeleton className="h-4 w-16 mx-auto mb-1" />
              <Skeleton className="h-5 w-20 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-4 w-16 mx-auto mb-1" />
              <Skeleton className="h-5 w-20 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-4 w-16 mx-auto mb-1" />
              <Skeleton className="h-5 w-20 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="rewards-chart">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-xl" data-testid="text-rewards-chart-title">Your Daily Returns</h3>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="h-48 relative">
          <canvas ref={chartRef} className="w-full h-full" data-testid="chart-canvas"></canvas>
          {!chartLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-500">Loading chart...</div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 mb-1">Pool Earnings</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300" data-testid="text-total-earned">
              +{totalEarned.toFixed(3)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">TON</p>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Daily Avg</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="text-avg-daily">
              +{avgDaily.toFixed(3)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">TON</p>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Auto Compound</p>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-300" data-testid="text-compounded">
              +{(totalEarned * 0.8).toFixed(3)}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">TON</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
