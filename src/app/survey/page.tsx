'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, FileText, Users, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface SurveyOption {
  id?: number;
  option_text: string;
}

interface SurveyQuestion {
  id?: number;
  question_text: string;
  question_type: 'choice' | 'text';
  is_required: boolean;
  display_order: number;
  options: SurveyOption[];
}

interface Survey {
  id?: number;
  title: string;
  description?: string;
  is_active: boolean;
  is_anonymous: boolean;
  question_count: number;
  answer_count: number;
  questions: SurveyQuestion[];
}

export default function SurveyListPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    is_active: boolean;
    is_anonymous: boolean;
    questions: SurveyQuestion[];
  }>({
    title: '',
    description: '',
    is_active: true,
    is_anonymous: false,
    questions: [{ question_text: '', question_type: 'choice', is_required: true, display_order: 0, options: [{ option_text: '' }] }],
  });

  useEffect(() => {
    fetchSurveys();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user?.role === 'admin' || data.user?.role === 'super_admin') {
          setIsAdmin(true);
        }
      }
    } catch {}
  };

  const fetchSurveys = async () => {
    try {
      const res = await fetch('/api/surveys');
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
      }
    } catch {}
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      is_active: true,
      is_anonymous: false,
      questions: [{ question_text: '', question_type: 'choice', is_required: true, display_order: 0, options: [{ option_text: '' }] }],
    });
  };

  const openCreate = () => {
    resetForm();
    setEditingSurvey(null);
    setShowCreateDialog(true);
  };

  const openEdit = (survey: Survey) => {
    setFormData({
      title: survey.title,
      description: survey.description || '',
      is_active: survey.is_active,
      is_anonymous: survey.is_anonymous,
      questions: survey.questions && survey.questions.length > 0
        ? survey.questions.map(q => ({
            ...q,
            options: q.question_type === 'choice'
              ? (q.options || []).map(o => ({ option_text: typeof o === 'string' ? o : (o as any).option_text || '' }))
              : []
          }))
        : [{ question_text: '', question_type: 'choice', is_required: true, display_order: 0, options: [{ option_text: '' }] }],
    });
    setEditingSurvey(survey);
    setShowCreateDialog(true);
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { question_text: '', question_type: 'choice', is_required: true, display_order: prev.questions.length, options: [{ option_text: '' }] }],
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      if (field === 'question_type') {
        if (value === 'choice') {
          questions[index].options = [{ option_text: '' }];
        } else {
          questions[index].options = [];
        }
      }
      return { ...prev, questions };
    });
  };

  const addOption = (qIndex: number) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      questions[qIndex] = { ...questions[qIndex], options: [...questions[qIndex].options, { option_text: '' }] };
      return { ...prev, questions };
    });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      questions[qIndex] = { ...questions[qIndex], options: questions[qIndex].options.filter((_, i) => i !== oIndex) };
      return { ...prev, questions };
    });
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      const options = [...questions[qIndex].options];
      options[oIndex] = { option_text: value };
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, questions };
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入问卷标题');
      return;
    }
    for (const q of formData.questions) {
      if (!q.question_text.trim()) {
        toast.error('请填写所有题目');
        return;
      }
      if (q.question_type === 'choice' && q.options.filter(o => o.option_text.trim()).length < 2) {
        toast.error('客观题至少需要2个选项');
        return;
      }
    }

    try {
      const url = editingSurvey ? `/api/surveys/${editingSurvey.id}` : '/api/surveys';
      const method = editingSurvey ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingSurvey ? '更新成功' : '创建成功');
        setShowCreateDialog(false);
        fetchSurveys();
      } else {
        const data = await res.json();
        toast.error(data.error || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此问卷？')) return;
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('删除成功');
        fetchSurveys();
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">问卷中心</h1>
          <p className="text-muted-foreground mt-1">参与调查，表达你的观点</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            创建问卷
          </Button>
        )}
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">暂无问卷</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {surveys.map(survey => (
            <Card key={survey.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{survey.title}</CardTitle>
                    {survey.description && (
                      <CardDescription className="mt-1">{survey.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge variant={survey.is_active ? 'default' : 'secondary'}>
                      {survey.is_active ? '进行中' : '已结束'}
                    </Badge>
                    {survey.is_anonymous && (
                      <Badge variant="outline">匿名</Badge>
                    )}
                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(survey)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(survey.id!)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    {survey.question_count || 0} 道题
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {survey.answer_count || 0} 人已答
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={`/survey/${survey.id}`}>
                  <Button className="w-full" variant={survey.is_active ? 'default' : 'outline'}>
                    {survey.is_active ? '进入问卷' : '查看统计'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 创建/编辑问卷对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSurvey ? '编辑问卷' : '创建问卷'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>问卷标题 *</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入问卷标题"
              />
            </div>

            <div>
              <Label>问卷描述</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入问卷描述（选填）"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, is_active: v }))}
                />
                <Label>开启</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_anonymous}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, is_anonymous: v }))}
                />
                <Label>匿名</Label>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-semibold">题目列表</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-1" /> 添加题目
                </Button>
              </div>

              {formData.questions.map((q, qIndex) => (
                <div key={qIndex} className="border rounded-lg p-4 mb-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">第 {qIndex + 1} 题</span>
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  <Input
                    value={q.question_text}
                    onChange={e => updateQuestion(qIndex, 'question_text', e.target.value)}
                    placeholder="题目内容"
                  />

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Select
                        value={q.question_type}
                        onValueChange={v => updateQuestion(qIndex, 'question_type', v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="choice">客观题</SelectItem>
                          <SelectItem value="text">主观题</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={q.is_required}
                        onCheckedChange={v => updateQuestion(qIndex, 'is_required', v)}
                      />
                      <Label className="text-sm">必填</Label>
                    </div>
                  </div>

                  {q.question_type === 'choice' && (
                    <div className="pl-4 space-y-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground w-6">{String.fromCharCode(65 + oIndex)}.</span>
                          <Input
                            value={opt.option_text}
                            onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`选项 ${String.fromCharCode(65 + oIndex)}`}
                            className="flex-1"
                          />
                          {q.options.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeOption(qIndex, oIndex)}>
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                        <Plus className="w-3 h-3 mr-1" /> 添加选项
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleSave}>{editingSurvey ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
