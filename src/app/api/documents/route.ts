import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/documents - Liste des documents
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // Use service client for all queries to avoid RLS issues
    const serviceClient = await createServiceClient()

    // Get user's workspace
    const { data: membership, error: membershipError } = await serviceClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      console.error('Workspace membership error:', membershipError)
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    // Build documents query
    let query = serviceClient
      .from('documents')
      .select(`
        *,
        project:projects(id, name)
      `)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Documents fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(documents || [])
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// POST /api/documents - Upload un document
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Use service client for all queries to avoid RLS issues
    const serviceClient = await createServiceClient()

    // Get user's workspace
    const { data: membership, error: membershipError } = await serviceClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      console.error('Workspace membership error:', membershipError)
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await serviceClient
      .from('projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.workspace_id !== membership.workspace_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Determine document type
    const mimeType = file.type
    let docType = 'OTHER'
    if (mimeType.includes('pdf')) docType = 'PDF'
    else if (mimeType.includes('image')) docType = 'IMAGE'
    else if (mimeType.includes('audio')) docType = 'AUDIO'
    else if (mimeType.includes('video')) docType = 'VIDEO'
    else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) docType = 'SPREADSHEET'
    else if (mimeType.includes('text')) docType = 'TEXT'

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const storagePath = `documents/${projectId}/${fileName}`

    const { error: uploadError } = await serviceClient.storage
      .from('documents')
      .upload(storagePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
    }

    // Create document record
    const { data: document, error: insertError } = await serviceClient
      .from('documents')
      .insert({
        project_id: projectId,
        name: file.name,
        type: docType,
        mime_type: mimeType,
        size_bytes: file.size,
        storage_path: storagePath,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Document insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
