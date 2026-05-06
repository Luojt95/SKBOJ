import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getAdminSupabaseClient();
    const body = await request.json();
    const { answers } = body;
    
    // 获取当前用户
    const userCookie = request.cookies.get('user');
    if (!userCookie) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const user = JSON.parse(decodeURIComponent(userCookie.value));
    
    // 检查问卷是否存在且处于激活状态
    const { data: survey, error: surveyError } = await client
      .from('surveys')
      .select('id, is_active')
      .eq('id', id)
      .limit(1);
    
    if (surveyError || !survey || survey.length === 0) {
      return NextResponse.json({ error: '问卷不存在' }, { status: 404 });
    }
    
    if (!survey[0].is_active) {
      return NextResponse.json({ error: '问卷已关闭' }, { status: 400 });
    }
    
    // 获取问卷的所有题目
    const { data: questions } = await client
      .from('survey_questions')
      .select('id, question_type, is_required')
      .eq('survey_id', id);
    
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: '问卷没有题目' }, { status: 400 });
    }
    
    // 验证必填题目
    const requiredQuestions = questions.filter((q: any) => q.is_required);
    for (const q of requiredQuestions) {
      const answer = answers.find((a: any) => a.question_id === q.id);
      if (!answer || 
          (q.question_type === 'choice' && !answer.selected_option_id) ||
          (q.question_type === 'text' && (!answer.answer_text || answer.answer_text.trim() === ''))) {
        return NextResponse.json({ error: `请回答所有必填题目` }, { status: 400 });
      }
    }
    
    // 删除之前的回答（同一用户对同一问卷只能提交一次）
    const questionIds = questions.map((q: any) => q.id);
    await client
      .from('survey_answers')
      .delete()
      .eq('user_id', user.id)
      .in('question_id', questionIds);
    
    // 插入新回答
    const answersToInsert = answers
      .filter((a: any) => 
        (a.question_type === 'choice' && a.selected_option_id) ||
        (a.question_type === 'text' && a.answer_text && a.answer_text.trim() !== '')
      )
      .map((a: any) => ({
        question_id: a.question_id,
        user_id: user.id,
        answer_text: a.answer_text || null,
        selected_option_id: a.selected_option_id || null
      }));
    
    if (answersToInsert.length > 0) {
      const { error: insertError } = await client
        .from('survey_answers')
        .insert(answersToInsert);
      
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, message: '提交成功' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
