import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient, getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getAdminSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('include_stats') === 'true';
    
    // 获取问卷
    const { data: survey, error } = await client
      .from('surveys')
      .select(`
        *,
        survey_questions (
          *,
          survey_options (*)
        )
      `)
      .eq('id', id)
      .limit(1);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!survey || survey.length === 0) {
      return NextResponse.json({ error: '问卷不存在' }, { status: 404 });
    }
    
    const result = survey[0];
    
    if (includeStats && result.survey_questions) {
      // 获取每个题目的回答统计
      result.questions = await Promise.all(
        (result.survey_questions || []).map(async (q: any) => {
          if (q.question_type === 'text') {
            const { count } = await client
              .from('survey_answers')
              .select('*', { count: 'exact', head: true })
              .eq('question_id', q.id);
            return { ...q, answer_count: count || 0 };
          } else {
            const optionStats = await Promise.all(
              (q.survey_options || []).map(async (opt: any) => {
                const { count } = await client
                  .from('survey_answers')
                  .select('*', { count: 'exact', head: true })
                  .eq('selected_option_id', opt.id);
                return { ...opt, count: count || 0 };
              })
            );
            const totalAnswers = optionStats.reduce((sum: number, o: any) => sum + o.count, 0);
            return { 
              ...q, 
              option_stats: optionStats.map((o: any) => ({
                ...o,
                percentage: totalAnswers > 0 ? Math.round((o.count / totalAnswers) * 100) : 0
              }))
            };
          }
        })
      );
    }
    
    // 按 display_order 排序
    if (result.survey_questions) {
      result.survey_questions.sort((a: any, b: any) => a.display_order - b.display_order);
    }
    
    return NextResponse.json({ survey: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getAdminSupabaseClient();
    const body = await request.json();
    const { title, description, is_active, is_anonymous } = body;
    
    // 获取当前用户
    const userCookie = request.cookies.get('user');
    if (!userCookie) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const user = JSON.parse(decodeURIComponent(userCookie.value));
    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || 
                    (typeof user.role === 'string' && user.role.includes('admin'));
    if (!isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    // 更新问卷
    const { error: updateError } = await client
      .from('surveys')
      .update({
        title,
        description,
        is_active,
        is_anonymous,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // 如果有题目更新
    if (body.questions) {
      // 删除旧的题目和选项
      await client.from('survey_answers').delete()
        .in('question_id', 
          (await client.from('survey_questions').select('id').eq('survey_id', id)).data?.map((q: any) => q.id) || []
        );
      await client.from('survey_options').delete()
        .in('question_id',
          (await client.from('survey_questions').select('id').eq('survey_id', id)).data?.map((q: any) => q.id) || []
        );
      await client.from('survey_questions').delete().eq('survey_id', id);
      
      // 创建新题目
      const questionsToInsert = body.questions.map((q: any, index: number) => ({
        survey_id: parseInt(id),
        question_text: q.question_text,
        question_type: q.question_type || 'choice',
        is_required: q.is_required !== false,
        display_order: index
      }));
      
      const { data: createdQuestions } = await client
        .from('survey_questions')
        .insert(questionsToInsert)
        .select();
      
      // 为客观题创建选项
      for (let i = 0; i < (createdQuestions || []).length; i++) {
        const q = body.questions[i];
        const createdQ = (createdQuestions || [])[i];
        
        if (q.question_type === 'choice' && q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map((opt: string, optIndex: number) => ({
            question_id: createdQ.id,
            option_text: opt,
            display_order: optIndex
          }));
          
          await client.from('survey_options').insert(optionsToInsert);
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getAdminSupabaseClient();
    
    // 获取当前用户
    const userCookie = request.cookies.get('user');
    if (!userCookie) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const user = JSON.parse(decodeURIComponent(userCookie.value));
    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || 
                    (typeof user.role === 'string' && user.role.includes('admin'));
    if (!isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    // 删除问卷（级联删除题目和选项）
    const { error } = await client
      .from('surveys')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
