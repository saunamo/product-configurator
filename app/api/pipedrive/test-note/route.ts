import { NextRequest, NextResponse } from "next/server";
import { createNote, getDealNotes } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/test-note
 * Test endpoint to add a note to a Pipedrive deal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dealId = body.dealId || 7919; // Default to deal 7919
    
    if (!dealId) {
      return NextResponse.json(
        { success: false, error: "Deal ID is required" },
        { status: 400 }
      );
    }

    console.log(`[Test Note] Attempting to create note on deal ${dealId}...`);

    // Create a test note
    const testNoteContent = `TEST NOTE - Created at ${new Date().toISOString()}\n\nThis is a test note to verify note creation works.\n\nIf you see this note, note creation is working!`;
    
    try {
      const noteResponse = await createNote({
        content: testNoteContent,
        deal_id: dealId,
        pinned_to_deal_flag: 1,
      });

      const noteId = noteResponse.data?.id;
      console.log(`✅ Test note created successfully! Note ID: ${noteId}`);

      // Wait a moment for indexing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify by retrieving notes
      const notesResponse = await getDealNotes(dealId);
      const notes = notesResponse.data || [];
      const foundNote = notes.find((note: any) => note.id === noteId);

      if (foundNote) {
        console.log(`✅ Verification successful: Note found in deal ${dealId}`);
        return NextResponse.json({
          success: true,
          message: `Test note created successfully on deal ${dealId}`,
          noteId: noteId,
          noteContent: foundNote.content?.substring(0, 100) + '...',
          totalNotes: notes.length,
        });
      } else {
        console.warn(`⚠️ Note created but not found in verification (may need more time to index)`);
        return NextResponse.json({
          success: true,
          message: `Test note created but not yet indexed`,
          noteId: noteId,
          totalNotes: notes.length,
        });
      }
    } catch (error: any) {
      console.error(`❌ Failed to create test note:`, {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        stack: error.stack?.substring(0, 500),
      });

      return NextResponse.json(
        {
          success: false,
          error: `Failed to create test note: ${error.message || 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? {
            message: error.message,
            status: error.status,
            stack: error.stack?.substring(0, 500),
          } : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Test note endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process request",
      },
      { status: 500 }
    );
  }
}
