import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { addCash } from '@/services/portfolioService';

interface AddCashDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isGuest?: boolean;
  onAddGuestCash?: (amount: number) => void;
  currentCash?: number;
}

const AddCashDialog: React.FC<AddCashDialogProps> = ({ 
  isOpen, 
  onClose, 
  isGuest, 
  onAddGuestCash,
  currentCash = 0
}) => {
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cashAmount === 0) {
      toast({
        title: 'Error',
        description: 'Please enter a non-zero cash amount',
        variant: 'destructive',
      });
      return;
    }

    // Check if subtracting cash would result in negative balance
    if (cashAmount < 0 && Math.abs(cashAmount) > currentCash) {
      toast({
        title: 'Error',
        description: 'Cannot subtract more cash than available in your balance',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isGuest && onAddGuestCash) {
        onAddGuestCash(cashAmount);
        const actionText = cashAmount > 0 ? 'added to' : 'subtracted from';
        toast({
          title: 'Success (Guest)',
          description: `$${Math.abs(cashAmount).toFixed(2)} ${actionText} your portfolio`,
        });
        onClose();
      } else if (!isGuest) {
        await addCash(cashAmount);
        await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        await queryClient.refetchQueries({ queryKey: ['portfolio'], type: 'active' });
        const actionText = cashAmount > 0 ? 'added to' : 'subtracted from';
        toast({
          title: 'Success',
          description: `$${Math.abs(cashAmount).toFixed(2)} ${actionText} your portfolio`,
        });
        onClose();
      } else {
        throw new Error('Guest add function not provided');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update cash in portfolio',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add/Subtract Cash</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="cash-amount">Cash Amount</Label>
              <div className="relative">
                <span className="absolute left-3 inset-y-0 flex items-center text-gray-400">$</span>
                <Input
                  id="cash-amount"
                  type="number"
                  value={cashAmount || ''}
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                  className="pl-7"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-400">
                Enter a positive amount to add cash or negative amount to subtract cash from your portfolio.
                {currentCash > 0 && ` Current balance: $${currentCash.toFixed(2)}`}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || cashAmount === 0}>
              {isLoading ? 'Processing...' : 'Update Cash'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCashDialog; 