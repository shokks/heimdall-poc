'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type PortfolioPosition } from '@/lib/storage';
import { parsePortfolioText } from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Loader2, Save } from 'lucide-react';

export default function PortfolioEditClient() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [newPositionsText, setNewPositionsText] = useState('');
  const [editedPositions, setEditedPositions] = useState<PortfolioPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<string | null>(null);

  // Ref to track the first render to avoid auto-saving immediately after load
  const isFirstRender = useRef(true);
  // Debounce timer id
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convex hooks
  const portfolio = useQuery(
    api.portfolios.getPortfolioByUser, 
    user ? { clerkId: user.id } : "skip"
  );
  const savePortfolio = useMutation(api.portfolios.savePortfolio);
  const createSnapshot = useMutation(api.portfolioSnapshots.createSnapshot);

  // Initialize edited positions when portfolio loads
  useEffect(() => {
    if (portfolio?.positions) {
      setEditedPositions([...portfolio.positions]);
    }
  }, [portfolio]);

  const handleAddMorePositions = async () => {
    if (!newPositionsText.trim() || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const newPositions = await parsePortfolioText(newPositionsText.trim());
      
      if (newPositions.length === 0) {
        setError('No valid stock positions found. Please try rephrasing your input.');
        return;
      }

      // Merge with existing positions, avoiding duplicates
      const existingSymbols = editedPositions.map(p => p.symbol);
      const uniqueNewPositions = newPositions.filter(p => !existingSymbols.includes(p.symbol));
      
      // Update existing positions with new shares if same symbol
      const updatedPositions = [...editedPositions];
      newPositions.forEach(newPos => {
        const existingIndex = updatedPositions.findIndex(p => p.symbol === newPos.symbol);
        if (existingIndex >= 0) {
          updatedPositions[existingIndex].shares += newPos.shares;
        }
      });

      setEditedPositions([...updatedPositions, ...uniqueNewPositions]);
      setNewPositionsText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse positions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShares = (symbol: string, shares: number) => {
    if (shares <= 0) return;
    
    setEditedPositions(positions => 
      positions.map(pos => 
        pos.symbol === symbol ? { ...pos, shares } : pos
      )
    );
  };

  const handleDeletePosition = (symbol: string) => {
    setPositionToDelete(symbol);
    setShowDeleteDialog(true);
  };

  const confirmDeletePosition = () => {
    if (positionToDelete) {
      setEditedPositions(positions => 
        positions.filter(pos => pos.symbol !== positionToDelete)
      );
      setPositionToDelete(null);
    }
    setShowDeleteDialog(false);
  };

  /**
   * Manually triggered save (fallback). This remains for edge-cases but
   * typical saves will be handled automatically via the effect below.
   */
  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await savePortfolio({ clerkId: user.id, positions: editedPositions });
      await createSnapshot({ clerkId: user.id });
    } catch (error) {
      console.error('Failed to save portfolio:', error);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Auto-save whenever editedPositions changes (debounced).
   */
  useEffect(() => {
    if (!user) return;
    // Skip auto-save on initial render after portfolio fetch
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any existing timeout to debounce rapid changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only attempt save when there are changes
    const hasChanges = JSON.stringify(editedPositions) !== JSON.stringify(portfolio?.positions || []);
    if (!hasChanges) return;

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await savePortfolio({ clerkId: user.id, positions: editedPositions });
        await createSnapshot({ clerkId: user.id });
      } catch (error) {
        console.error('Auto-save failed:', error);
        setError('Failed to auto-save changes. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, 1500); // 1.5s debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editedPositions, user]);

  const hasChanges = JSON.stringify(editedPositions) !== JSON.stringify(portfolio?.positions || []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Portfolio
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Edit Portfolio</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your stock positions
                </p>
              </div>
            </div>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10"
                }
              }}
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Add More Positions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add More Positions
            </CardTitle>
            <CardDescription>
              Use natural language to add more stocks to your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={newPositionsText}
              onChange={(e) => setNewPositionsText(e.target.value)}
              placeholder="I also have 50 Tesla shares and 25 Disney stocks..."
              className="min-h-20"
              disabled={isLoading}
            />
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
            <Button 
              onClick={handleAddMorePositions}
              disabled={!newPositionsText.trim() || isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Positions...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Positions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current Positions Table */}
        {editedPositions.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
              <CardDescription>
                Edit your existing stock positions below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedPositions.map((position) => (
                    <TableRow key={position.symbol}>
                      <TableCell className="font-mono font-semibold">
                        {position.symbol}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {position.companyName}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={position.shares}
                          onChange={(e) => handleUpdateShares(position.symbol, parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePosition(position.symbol)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No positions in your portfolio yet.</p>
              <p className="text-sm text-muted-foreground">
                Use the "Add More Positions" section above to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Save/Cancel Actions */}
        {editedPositions.length > 0 && (
          <div className="flex gap-4 justify-end">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges}
              disabled
              className="min-w-[120px]"
              title="Changes are saved automatically"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Saved ✓
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {positionToDelete} from your portfolio? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePosition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}