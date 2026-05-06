'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, BarChart3, Users, Plus, Edit2, Trash2, X } from 'lucide-react';

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
  options?: SurveyOption[];
}

interface Survey {
  id: number;
  title: string;
  description: string;
  is_active: boolean;
  is_anonymous: boolean;
  question_count: number;
  answer_count: number;
  created_at: string;
  questions?: SurveyQuestion[];
}

export default function SurveyPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSurvey, setExpandedSurvey] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
    is_anonymous: false,
  });
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  useEffect(() => {
    fetchSurveys();
    checkAdmin();
  }, []);

  const checkAdmin = () => {
    try {
      const userCookie = document.cookie.split(';').find(c => c.trim().startsWith('user='));
      if (userCookie) {
        const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        const roleStr = user.role || '';
        if (roleStr.includes('admin') || roleStr === 'admin' || roleStr === 'super_admin') {
          setIsAdmin(true);
        }
      }
    } catch (e) {}
  };

  const fetchSurveys = async () => {
    try {
      const res = await fetch('/api/surveys?include_stats=true');
      const data = await res.json();
      setSurveys(data.surveys || []);
    } catch (error) {
      console.error('获取问卷失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (surveyId: number) => {
    setExpandedSurvey(expandedSurvey === surveyId ? null : surveyId);
  };

  const openCreateModal = () => {
    setEditingSurvey(null);
    setFormData({ title: '', description: '', is_active: true, is_anonymous: false });
    setQuestions([{ question_text: '', question_type: 'choice', is_required: true, display_order: 0, options: [{ option_text: '' }] }]);
    setShowModal(true);
  };

  const openEditModal = (survey: Survey) => {
    setEditingSurvey(survey);
    setFormData({
      title: survey.title,
      description: survey.description || '',
      is_active: survey.is_active,
      is_anonymous: survey.is_anonymous,
    });
    // 加载问卷详情
    fetch(`/api/surveys/${survey.id}`).then(res => res.json()).then(data => {
      if (data.survey && data.survey.questions) {
        setQuestions(data.survey.questions.map((q: any, i: number) => ({
          ...q,
          display_order: i,
          options: q.options || (q.question_type === 'choice' ? [{ option_text: '' }] : [])
        })));
      }
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('请输入问卷标题');
      return;
    }
    if (questions.length === 0) {
      alert('请至少添加一个题目');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingSurvey ? `/api/surveys/${editingSurvey.id}` : '/api/surveys';
      const method = editingSurvey ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, questions }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchSurveys();
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (surveyId: number) => {
    if (!confirm('确定要删除这个问卷吗？')) return;
    
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSurveys();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      question_type: 'choice',
      is_required: true,
      display_order: questions.length,
      options: [{ option_text: '' }]
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    if (field === 'question_type' && value === 'text') {
      newQuestions[index].options = [];
    } else if (field === 'question_type' && value === 'choice' && (!newQuestions[index].options || newQuestions[index].options.length === 0)) {
      newQuestions[index].options = [{ option_text: '' }];
    }
    setQuestions(newQuestions);
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = [...(newQuestions[qIndex].options || []), { option_text: '' }];
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options![oIndex].option_text = value;
    setQuestions(newQuestions);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options!.filter((_, i) => i !== oIndex);
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">问卷调查</h1>
          <p className="text-gray-600">参与问卷调查，帮助我们做得更好</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            创建问卷
          </button>
        )}
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">暂无问卷</p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              创建第一个问卷
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(survey.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-semibold">{survey.title}</h2>
                      {!survey.is_active && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">已关闭</span>
                      )}
                      {survey.is_anonymous && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">匿名</span>
                      )}
                    </div>
                    {survey.description && (
                      <p className="text-gray-600 mb-4">{survey.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {survey.question_count} 个题目
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {survey.answer_count} 人已回答
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(survey); }}
                          className="p-2 text-gray-600 hover:text-blue-600"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(survey.id); }}
                          className="p-2 text-gray-600 hover:text-red-600"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/survey/${survey.id}`); }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {survey.answer_count > 0 ? '查看/继续回答' : '立即参与'}
                    </button>
                  </div>
                </div>
              </div>

              {expandedSurvey === survey.id && survey.questions && survey.questions.length > 0 && (
                <div className="border-t bg-gray-50 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    问卷统计
                  </h3>
                  <div className="space-y-6">
                    {survey.questions.map((question: any, qIndex: number) => (
                      <div key={question.id} className="bg-white rounded-lg p-4">
                        <p className="font-medium mb-3">
                          {qIndex + 1}. {question.question_text}
                          {question.is_required && <span className="text-red-500 ml-1">*</span>}
                          <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            {question.question_type === 'choice' ? '客观题' : '主观题'}
                          </span>
                        </p>
                        
                        {question.question_type === 'choice' && question.option_stats && (
                          <div className="space-y-2">
                            {question.option_stats.map((option: any) => {
                              const percentage = option.percentage || 0;
                              return (
                                <div key={option.id} className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                      <span>{option.option_text}</span>
                                      <span className="text-gray-500">
                                        {option.count} 票 ({percentage}%)
                                      </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {question.question_type === 'text' && (
                          <p className="text-gray-500 text-sm">
                            已有 {question.answer_count || 0} 人回答
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑问卷弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingSurvey ? '编辑问卷' : '创建问卷'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div>
                <label className="block text-sm font-medium mb-1">问卷标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="请输入问卷标题"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">问卷描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="请输入问卷描述（可选）"
                />
              </div>
              
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>开启问卷</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_anonymous}
                    onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                  />
                  <span>匿名问卷</span>
                </label>
              </div>

              {/* 题目列表 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium">题目列表</label>
                  <button
                    onClick={addQuestion}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    + 添加题目
                  </button>
                </div>
                
                <div className="space-y-4">
                  {questions.map((q, qIndex) => (
                    <div key={qIndex} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-medium">题目 {qIndex + 1}</span>
                        <button
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      </div>
                      
                      <textarea
                        value={q.question_text}
                        onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mb-3"
                        rows={2}
                        placeholder="请输入题目内容"
                      />
                      
                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={q.question_type === 'choice'}
                            onChange={() => updateQuestion(qIndex, 'question_type', 'choice')}
                          />
                          <span>客观题（选择题）</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={q.question_type === 'text'}
                            onChange={() => updateQuestion(qIndex, 'question_type', 'text')}
                          />
                          <span>主观题（文本）</span>
                        </label>
                      </div>
                      
                      <label className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          checked={q.is_required}
                          onChange={(e) => updateQuestion(qIndex, 'is_required', e.target.checked)}
                        />
                        <span>必填</span>
                      </label>
                      
                      {q.question_type === 'choice' && (
                        <div className="space-y-2 pl-4">
                          <label className="text-sm text-gray-600">选项（客观题）</label>
                          {q.options?.map((opt, oIndex) => (
                            <div key={oIndex} className="flex gap-2">
                              <input
                                type="text"
                                value={opt.option_text}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                className="flex-1 border rounded px-2 py-1"
                                placeholder={`选项 ${oIndex + 1}`}
                              />
                              <button
                                onClick={() => removeOption(qIndex, oIndex)}
                                className="text-red-500 hover:text-red-700"
                              >
                                删除
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(qIndex)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            + 添加选项
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {questions.length === 0 && (
                    <p className="text-gray-500 text-center py-4">暂无题目，请点击上方添加</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存问卷'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
