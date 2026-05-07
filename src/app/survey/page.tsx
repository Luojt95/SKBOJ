'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, BarChart3, Users, FileText, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SurveyOption {
  id?: number;
  option_text: string;
}

interface SurveyQuestion {
  id?: number;
  question_text: string;
  question_type: 'choice' | 'text';
  is_required: boolean;
  options: SurveyOption[];
}

interface FormOption {
  id?: number;
  option_text: string;
}

interface FormQuestion {
  id?: number;
  question_text: string;
  question_type: 'choice' | 'text';
  is_required: boolean;
  options: FormOption[];
}

interface Survey {
  id: number;
  title: string;
  description: string;
  is_active: boolean;
  is_anonymous: boolean;
  created_at: string;
  question_count: number;
  answer_count: number;
  questions?: SurveyQuestion[];
  statistics?: Record<number, { total: number; options: Record<number, { count: number; percentage: number }> }>;
}

function SurveyContent() {
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
    is_anonymous: false,
    questions: [] as SurveyQuestion[]
  });

  useEffect(() => {
    setIsClient(true);
    // 通过 API 检查管理员权限
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          const role = data.user?.role;
          return role === 'admin' || role === 'super_admin' || (role && role.includes('admin'));
        }
      } catch (e) {
        console.error('Auth check error:', e);
      }
      return false;
    };
    
    checkAdmin().then(admin => {
      setIsAdmin(admin);
    });
    
    // 获取问卷列表
    fetch('/api/surveys')
      .then(res => res.json())
      .then(data => {
        setSurveys(data.surveys || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('获取问卷失败');
        setLoading(false);
      });
  }, [toast]);

  const openCreateModal = () => {
    setEditingSurvey(null);
    setFormData({
      title: '',
      description: '',
      is_active: true,
      is_anonymous: false,
      questions: []
    });
    setShowModal(true);
  };

  const openEditModal = (survey: Survey) => {
    setEditingSurvey(survey);
    setFormData({
      title: survey.title,
      description: survey.description || '',
      is_active: survey.is_active,
      is_anonymous: survey.is_anonymous,
      questions: survey.questions || []
    });
    setShowModal(true);
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, {
        question_text: '',
        question_type: 'choice',
        is_required: true,
        options: [{ option_text: '' }, { option_text: '' }]
      }]
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const addOption = (questionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? { ...q, options: [...q.options, { option_text: '' }] } : q
      )
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) } : q
      )
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? { ...q, options: q.options.map((o, oi) => oi === optionIndex ? { ...o, option_text: value } : o) } : q
      )
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入问卷标题');
      return;
    }
    if (formData.questions.length === 0) {
      toast.error('请至少添加一道题目');
      return;
    }

    // 验证题目
    for (const q of formData.questions) {
      if (!q.question_text.trim()) {
        toast.error('请填写所有题目内容');
        return;
      }
      if (q.question_type === 'choice' && q.options.length < 2) {
        toast.error('选择题至少需要2个选项');
        return;
      }
      if (q.question_type === 'choice') {
        for (const o of q.options) {
          if (!o.option_text.trim()) {
            toast.error('请填写所有选项内容');
            return;
          }
        }
      }
    }

    try {
      const url = editingSurvey ? `/api/surveys/${editingSurvey.id}` : '/api/surveys';
      const method = editingSurvey ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingSurvey ? '问卷已更新' : '问卷已创建');
        setShowModal(false);
        // 重新获取列表
        const listRes = await fetch('/api/surveys');
        const listData = await listRes.json();
        setSurveys(listData.surveys || []);
      } else {
        const data = await res.json();
        toast.error(data.error || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const deleteSurvey = async (id: number) => {
    if (!confirm('确定要删除这个问卷吗？')) return;
    
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('问卷已删除');
        setSurveys(prev => prev.filter(s => s.id !== id));
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  if (!isClient) return null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">问卷中心</h1>
          <p className="text-muted-foreground mt-1">参与问卷调查</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            创建问卷
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : surveys.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无问卷</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {surveys.map(survey => (
            <SurveyCard 
              key={survey.id} 
              survey={survey} 
              isAdmin={isAdmin}
              onEdit={() => openEditModal(survey)}
              onDelete={() => deleteSurvey(survey.id)}
            />
          ))}
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSurvey ? '编辑问卷' : '创建问卷'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>问卷标题 *</Label>
              <Input 
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入问卷标题"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>问卷描述</Label>
              <Textarea 
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入问卷描述（可选）"
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={formData.is_active}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>开启问卷</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={formData.is_anonymous}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, is_anonymous: checked }))}
                />
                <Label>匿名模式</Label>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>题目</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加题目
                </Button>
              </div>
              
              {formData.questions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">暂无题目，点击上方按钮添加</p>
              )}
              
              {formData.questions.map((question, qIndex) => (
                <Card key={qIndex} className="mb-3">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">题目 {qIndex + 1}</span>
                      <div className="flex items-center space-x-2">
                        <Select 
                          value={question.question_type}
                          onValueChange={v => updateQuestion(qIndex, 'question_type', v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="choice">客观题</SelectItem>
                            <SelectItem value="text">主观题</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    <Input 
                      value={question.question_text}
                      onChange={e => updateQuestion(qIndex, 'question_text', e.target.value)}
                      placeholder="请输入题目内容"
                      className="mb-2"
                    />
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <Switch 
                        checked={question.is_required}
                        onCheckedChange={checked => updateQuestion(qIndex, 'is_required', checked)}
                      />
                      <Label className="text-sm">必填</Label>
                    </div>
                    
                    {question.question_type === 'choice' && (
                      <div className="space-y-2 pl-4">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">{String.fromCharCode(65 + oIndex)}.</span>
                            <Input 
                              value={option.option_text}
                              onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder="选项内容"
                              className="flex-1"
                            />
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeOption(qIndex, oIndex)}
                              disabled={question.options.length <= 2}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => addOption(qIndex)}
                          className="text-sm"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          添加选项
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>取消</Button>
            <Button onClick={handleSubmit}>
              {editingSurvey ? '保存修改' : '创建问卷'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SurveyCard({ survey, isAdmin, onEdit, onDelete }: { 
  survey: Survey; 
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'detail' | 'stats'>('detail');
  const [showStats, setShowStats] = useState(false);
  const [statistics, setStatistics] = useState<Record<number, { total: number; options: Record<number, { count: number; percentage: number }> }> | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, { type: string; optionId?: number; text?: string }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    // 通过 API 检查登录状态
    fetch('/api/auth/me').then(res => {
      if (res.ok) {
        setIsLoggedIn(true);
      }
    }).catch(() => {});
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/surveys/${survey.id}?include_stats=true`);
      const data = await res.json();
      if (data.survey) {
        setStatistics(data.survey.statistics);
        setAnswers(data.survey.answers || []);
      }
    } catch {
      toast.error('加载统计失败');
    }
    setLoadingStats(false);
  };

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab as 'detail' | 'stats');
    if (tab === 'stats' && !statistics) {
      await loadStats();
    }
  };

  const handleAnswer = (questionId: number, type: string, value: any) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: { type, ...value } }));
  };

  const submitAnswers = async () => {
    // 验证必填
    for (const q of survey.questions || []) {
      if (q.is_required && q.id) {
        const answer = userAnswers[q.id];
        if (!answer || (q.question_type === 'choice' && !answer.optionId) || (q.question_type === 'text' && !answer.text?.trim())) {
          toast.error('请完成所有必填题目');
          return;
        }
      }
    }

    try {
      const res = await fetch(`/api/surveys/${survey.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: userAnswers })
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success('提交成功');
      } else {
        const data = await res.json();
        toast.error(data.error || '提交失败');
      }
    } catch {
      toast.error('提交失败');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{survey.title}</CardTitle>
            {survey.description && (
              <p className="text-sm text-muted-foreground mt-1">{survey.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={survey.is_active ? 'default' : 'secondary'}>
              {survey.is_active ? '进行中' : '已结束'}
            </Badge>
            {survey.is_anonymous && (
              <Badge variant="outline">匿名</Badge>
            )}
            {isAdmin && (
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
          <span className="flex items-center">
            <FileText className="w-4 h-4 mr-1" />
            {survey.question_count} 道题
          </span>
          <span className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {survey.answer_count} 人已答
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="detail">问卷详情</TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="w-4 h-4 mr-1" />
              统计
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="detail" className="mt-4">
            {!isLoggedIn ? (
              <p className="text-center text-muted-foreground py-4">请先登录后再作答</p>
            ) : submitted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="text-lg font-medium">您已提交过此问卷</p>
              </div>
            ) : !survey.is_active ? (
              <p className="text-center text-muted-foreground py-4">问卷已结束</p>
            ) : (
              <div className="space-y-6">
                {survey.questions?.map((q, qIndex) => (
                  <div key={q.id} className="space-y-2">
                    <div className="font-medium">
                      {qIndex + 1}. {q.question_text}
                      {q.is_required && <span className="text-red-500">*</span>}
                    </div>
                    
                    {q.question_type === 'choice' ? (
                      <div className="space-y-2 pl-4">
                        {q.options?.map((opt: any, oIndex: number) => (
                          <label key={oIndex} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`q-${qIndex}`}
                              checked={userAnswers[qIndex]?.optionId === oIndex}
                              onChange={() => handleAnswer(qIndex, 'choice', { optionId: oIndex, option_text: opt.option_text })}
                              className="w-4 h-4"
                            />
                            <span>{String.fromCharCode(65 + oIndex)}. {opt.option_text}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Textarea
                        value={userAnswers[qIndex]?.text || ''}
                        onChange={e => handleAnswer(qIndex, 'text', { text: e.target.value })}
                        placeholder="请输入您的回答"
                        className="mt-2"
                      />
                    )}
                  </div>
                ))}
                
                {survey.questions && survey.questions.length > 0 && (
                  <Button onClick={submitAnswers} className="w-full">
                    提交问卷
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="stats" className="mt-4">
            {loadingStats ? (
              <p className="text-center text-muted-foreground py-4">加载中...</p>
            ) : statistics ? (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  共 {answers.length} 人作答
                </p>
                
                {survey.questions?.map((q, qIndex) => {
                  const stats = statistics[q.id || 0];
                  return (
                    <div key={q.id} className="space-y-3">
                      <div className="font-medium">
                        {qIndex + 1}. {q.question_text}
                        {q.is_required && <Badge variant="outline" className="ml-2 text-xs">必填</Badge>}
                      </div>
                      
                      {q.question_type === 'choice' && stats && (
                        <div className="space-y-2 pl-4">
                          {q.options?.map((opt: any, oIndex: number) => {
                            const optStats = stats.options?.[opt.id];
                            const percentage = optStats?.percentage || 0;
                            return (
                              <div key={opt.id} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>{String.fromCharCode(65 + oIndex)}. {opt.option_text}</span>
                                  <span className="text-muted-foreground">{percentage.toFixed(1)}% ({optStats?.count || 0})</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {q.question_type === 'text' && (
                        <div className="pl-4 space-y-2">
                          {answers
                            .filter(a => a.question_id === q.id && a.answer_text)
                            .map((a, ai) => (
                              <div key={a.id} className="text-sm p-2 bg-muted rounded">
                                {survey.is_anonymous ? `回答 ${ai + 1}` : a.users?.username || '匿名'}: {a.answer_text}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">暂无统计数据</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function SurveyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><p>加载中...</p></div>}>
      <SurveyContent />
    </Suspense>
  );
}
