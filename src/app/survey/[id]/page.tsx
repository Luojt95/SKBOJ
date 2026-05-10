'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ClipLoader } from 'react-spinners';
import { ClipboardList, Users, BarChart3, ArrowLeft, Send } from 'lucide-react';

interface SurveyOption {
  id: number;
  option_text: string;
  display_order: number;
  count?: number;
  percentage?: number;
}

interface SurveyQuestion {
  id: number;
  question_text: string;
  question_type: 'choice' | 'text';
  is_required: boolean;
  display_order: number;
  survey_options: SurveyOption[];
  option_stats?: SurveyOption[];
  answer_count?: number;
}

interface Survey {
  id: number;
  title: string;
  description: string;
  is_active: boolean;
  is_anonymous: boolean;
  created_at: string;
  survey_questions: SurveyQuestion[];
  response_count?: number;
}

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, { optionId?: number; text?: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<Survey | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => setCurrentUser(data?.user || null))
      .catch(() => {});
  }, []);

  const fetchSurvey = useCallback(async (includeStats = false) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}?include_stats=${includeStats}`);
      if (!res.ok) throw new Error('问卷不存在');
      const data = await res.json();
      if (includeStats) {
        setStatsData(data.survey);
      } else {
        setSurvey(data.survey);
      }
    } catch {
      toast.error('加载问卷失败');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    const questions = survey?.survey_questions || [];
    for (const q of questions) {
      if (q.is_required) {
        const answer = answers[q.id];
        if (!answer || (q.question_type === 'choice' && !answer.optionId) || (q.question_type === 'text' && !answer.text?.trim())) {
          toast.error(`请完成第 ${q.display_order + 1} 题`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '提交失败');
        return;
      }
      setSubmitted(true);
      toast.success('提交成功！');
    } catch {
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewStats = async () => {
    setShowStats(true);
    await fetchSurvey(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClipLoader size={40} color="#6366f1" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">问卷不存在</p>
            <Button variant="outline" onClick={() => router.push('/survey')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> 返回列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = survey.survey_questions || [];
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push('/survey')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回列表
        </Button>

        {/* 问卷标题 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ClipboardList className="h-6 w-6 text-indigo-500" />
                  {survey.title}
                </CardTitle>
                {survey.description && (
                  <CardDescription className="mt-2 text-base">{survey.description}</CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                {survey.is_active ? (
                  <Badge className="bg-green-100 text-green-700">进行中</Badge>
                ) : (
                  <Badge variant="secondary">已结束</Badge>
                )}
                {survey.is_anonymous && <Badge variant="outline">匿名</Badge>}
              </div>
            </div>
          </CardHeader>
        </Card>

        {submitted ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <div className="text-5xl mb-4">&#10003;</div>
              <h3 className="text-xl font-semibold mb-2">提交成功</h3>
              <p className="text-muted-foreground mb-4">感谢您的参与！</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push('/survey')}>返回列表</Button>
                <Button onClick={handleViewStats}>查看统计</Button>
              </div>
            </CardContent>
          </Card>
        ) : showStats ? (
          /* 统计视图 */
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <h2 className="text-xl font-semibold">统计结果</h2>
            </div>
            {(statsData?.survey_questions || questions).map((q, idx) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {idx + 1}. {q.question_text}
                    <Badge variant="outline" className="ml-2">
                      {q.question_type === 'choice' ? '客观题' : '主观题'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {q.question_type === 'choice' ? (
                    <div className="space-y-3">
                      {(q.option_stats || q.survey_options || []).map((opt: SurveyOption) => {
                        const pct = opt.percentage || 0;
                        return (
                          <div key={opt.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{opt.option_text}</span>
                              <span className="text-muted-foreground">{pct}% ({opt.count || 0}人)</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3">
                              <div
                                className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      共 {q.answer_count || 0} 人回答
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={() => setShowStats(false)}>关闭统计</Button>
          </div>
        ) : (
          /* 作答视图 */
          <div className="space-y-4">
            {!currentUser && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-4 text-center">
                  <p className="text-yellow-700">请先登录后再作答</p>
                </CardContent>
              </Card>
            )}

            {questions.map((q, idx) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {idx + 1}. {q.question_text}
                    {q.is_required && <span className="text-red-500 ml-1">*</span>}
                    <Badge variant="outline" className="ml-2">
                      {q.question_type === 'choice' ? '客观题' : '主观题'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {q.question_type === 'choice' ? (
                    <RadioGroup
                      value={answers[q.id]?.optionId?.toString() || ''}
                      onValueChange={(val) =>
                        setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], optionId: parseInt(val) } }))
                      }
                    >
                      <div className="space-y-2">
                        {(q.survey_options || []).sort((a, b) => a.display_order - b.display_order).map((opt) => (
                          <div key={opt.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                            <RadioGroupItem value={opt.id.toString()} id={`opt-${opt.id}`} />
                            <Label htmlFor={`opt-${opt.id}`} className="cursor-pointer flex-1">{opt.option_text}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <Textarea
                      placeholder="请输入您的回答..."
                      value={answers[q.id]?.text || ''}
                      onChange={(e) =>
                        setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], text: e.target.value } }))
                      }
                      rows={3}
                    />
                  )}
                </CardContent>
              </Card>
            ))}

            {questions.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  该问卷暂无题目
                </CardContent>
              </Card>
            )}

            {currentUser && questions.length > 0 && survey.is_active && (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? <ClipLoader size={20} color="#fff" /> : <><Send className="mr-2 h-4 w-4" /> 提交问卷</>}
              </Button>
            )}

            {isAdmin && (
              <Button variant="outline" onClick={handleViewStats} className="w-full">
                <BarChart3 className="mr-2 h-4 w-4" /> 查看统计
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
