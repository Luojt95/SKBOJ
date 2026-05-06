'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, FileText, CheckCircle } from 'lucide-react';

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  is_required: boolean;
  display_order: number;
  survey_options?: { id: number; option_text: string }[];
}

interface Survey {
  id: number;
  title: string;
  description: string;
  is_anonymous: boolean;
  survey_questions?: Question[];
}

interface Answer {
  question_id: number;
  question_type: string;
  selected_option_id?: number;
  answer_text?: string;
}

export default function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchSurvey();
    checkLogin();
  }, [id]);

  const checkLogin = () => {
    const userCookie = document.cookie.split(';').find(c => c.trim().startsWith('user='));
    setIsLoggedIn(!!userCookie);
  };

  const fetchSurvey = async () => {
    try {
      const res = await fetch(`/api/surveys/${id}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setSurvey(data.survey);
      
      // 初始化答案数组
      if (data.survey?.survey_questions) {
        setAnswers(
          data.survey.survey_questions.map((q: Question) => ({
            question_id: q.id,
            question_type: q.question_type,
            selected_option_id: undefined,
            answer_text: ''
          }))
        );
      }
    } catch (error) {
      console.error('获取问卷失败:', error);
      setError('获取问卷失败');
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (questionId: number, questionType: string, value: any) => {
    setAnswers(prev => prev.map(a => {
      if (a.question_id === questionId) {
        if (questionType === 'choice') {
          return { ...a, selected_option_id: value };
        } else {
          return { ...a, answer_text: value };
        }
      }
      return a;
    }));
  };

  const handleSubmit = async () => {
    // 验证必填项
    for (const q of survey?.survey_questions || []) {
      if (q.is_required) {
        const answer = answers.find(a => a.question_id === q.id);
        if (!answer || 
            (q.question_type === 'choice' && !answer.selected_option_id) ||
            (q.question_type === 'text' && (!answer.answer_text || answer.answer_text.trim() === ''))) {
          setError(`请回答第 ${(q.display_order || 0) + 1} 题`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/surveys/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setSubmitted(true);
    } catch (error) {
      console.error('提交失败:', error);
      setError('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/survey" className="flex items-center gap-2 text-blue-600 mb-4">
          <ArrowLeft className="h-4 w-4" />
          返回问卷列表
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">提交成功！</h1>
          <p className="text-gray-600 mb-6">感谢您的参与</p>
          <Link
            href="/survey"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            返回问卷列表
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/survey" className="flex items-center gap-2 text-blue-600 mb-4">
          <ArrowLeft className="h-4 w-4" />
          返回问卷列表
        </Link>
        <div className="max-w-2xl mx-auto text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">请先登录</h2>
          <p className="text-gray-600 mb-6">登录后即可参与问卷调查</p>
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/survey" className="flex items-center gap-2 text-blue-600 mb-4">
        <ArrowLeft className="h-4 w-4" />
        返回问卷列表
      </Link>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{survey?.title}</h1>
          {survey?.description && (
            <p className="text-gray-600 mb-4">{survey.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{survey?.survey_questions?.length} 个题目</span>
            {survey?.is_anonymous && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                匿名问卷
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {survey?.survey_questions?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow-md p-6">
              <p className="font-medium mb-4">
                {index + 1}. {question.question_text}
                {question.is_required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
                <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                  {question.question_type === 'choice' ? '客观题' : '主观题'}
                </span>
              </p>

              {question.question_type === 'choice' ? (
                <div className="space-y-2">
                  {question.survey_options?.map((option) => {
                    const answer = answers.find(a => a.question_id === question.id);
                    const isSelected = answer?.selected_option_id === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option.id}
                          checked={isSelected}
                          onChange={() => updateAnswer(question.id, 'choice', option.id)}
                          className="w-4 h-4"
                        />
                        <span>{option.option_text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={answers.find(a => a.question_id === question.id)?.answer_text || ''}
                  onChange={(e) => updateAnswer(question.id, 'text', e.target.value)}
                  placeholder="请输入您的回答..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 min-h-[100px]"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              提交中...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              提交问卷
            </>
          )}
        </button>
      </div>
    </div>
  );
}
