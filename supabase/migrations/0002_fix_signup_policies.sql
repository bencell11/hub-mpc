-- Fix: Allow authenticated users to create workspaces
-- This is needed for the signup flow

-- Allow any authenticated user to create a workspace
CREATE POLICY "Authenticated users can create workspaces"
    ON workspaces FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to add themselves as workspace members
CREATE POLICY "Users can add themselves to new workspaces"
    ON workspace_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own membership
CREATE POLICY "Users can view their own memberships"
    ON workspace_members FOR SELECT
    USING (user_id = auth.uid());
