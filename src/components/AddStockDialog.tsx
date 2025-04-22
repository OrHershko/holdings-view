import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface AddStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddStockDialog: React.FC<AddStockDialogProps> = ({ isOpen, onClose }) => {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [averageCost, setAverageCost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/portfolio/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          shares: parseFloat(shares),
          averageCost: parseFloat(averageCost),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add stock');
      }

      // 1. Invalidate the query
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] });

      // 2. Force refetch of active queries
      await queryClient.refetchQueries({ queryKey: ['portfolio'], type: 'active' });

      toast({
        title: 'Success',
        description: 'Stock added to portfolio successfully',
      });

      // 3. Close the dialog
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add stock to portfolio',
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
          <DialogTitle>Add Stock to Portfolio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                Symbol
              </Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="col-span-3"
                placeholder="e.g., AAPL"
                required
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
                placeholder="Number of shares"
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
                placeholder="Average cost per share"
                required
                min="0.01"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStockDialog; 