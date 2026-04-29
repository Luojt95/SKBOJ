import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  try {
    const client = getAdminSupabaseClient();
    
    const { data, error } = await client
      .from('site_config')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) {
      // 如果没有配置，返回默认值
      return NextResponse.json({
        config: {
          id: 1,
          hero_subtitle: 'OIer的乐土',
          hero_description: null,
          notice: null
        }
      });
    }
    
    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Error fetching site config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const client = getAdminSupabaseClient();
    const body = await request.json();
    
    const { hero_subtitle, hero_description, notice } = body;
    
    // 先尝试更新
    let { data, error } = await client
      .from('site_config')
      .update({
        hero_subtitle: hero_subtitle || 'OIer的乐土',
        hero_description: hero_description,
        notice: notice,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .limit(1);
    
    // 如果没有找到记录，插入新记录
    if (!data || data.length === 0) {
      const { data: insertData, error: insertError } = await client
        .from('site_config')
        .insert({
          id: 1,
          hero_subtitle: hero_subtitle || 'OIer的乐土',
          hero_description: hero_description,
          notice: notice
        })
        .select()
        .limit(1);
      
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      
      return NextResponse.json({ config: insertData[0] });
    }
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ config: data[0] });
  } catch (error) {
    console.error('Error updating site config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
