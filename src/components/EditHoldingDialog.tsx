import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { updateStockInFirestore, removeStockFromFirestore } from '@/services/firebaseService';

interface EditHoldingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  holding: {
    symbol: string;
    name: string;
    shares: number;
    averageCost: number;
  };
}

const EditHoldingDialog: React.FC<EditHoldingDialogProps> = ({ isOpen, onClose, holding }) => {
  const [shares, setShares] = useState(holding.shares.toString());
  const [averageCost, setAverageCost] = useState(holding.averageCost.toString());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use Firebase service to update the stock
      await updateStockInFirestore({
        symbol: holding.symbol,
        name: holding.name,
        shares: Number(shares),
        averageCost: Number(averageCost)
      });

      // 1. Invalidate the query
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] });

      toast({
        title: 'Success',
        description: 'Holding updated successfully',
      });

      // 3. Close the dialog (will trigger parent refetch)
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update holding',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      // Use Firebase service to remove the stock
      await removeStockFromFirestore(holding.symbol);

      // 1. Invalidate the query (don't refetch here)
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] });

      toast({
        title: 'Success',
        description: 'Holding deleted successfully',
      });

      // 2. Close the dialog (will trigger parent refetch)
      onClose();

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete holding',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Holding: {holding.symbol}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={holding.name}
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shares" className="text-right">
                Shares
              </Label>
              <Input
                id="shares"
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="col-span-3"
                required
                min="0.0001"
                step="0.0001"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="averageCost" className="text-right">
                Avg. Cost
              </Label>
              <Input
                id="averageCost"
                type="number"
                value={averageCost}
                onChange={(e) => setAverageCost(e.target.value)}
                className="col-span-3"
                required
                min="0.01"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              Delete
            </Button>
            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditHoldingDialog; 