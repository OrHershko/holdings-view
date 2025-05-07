import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import Papa from 'papaparse';
import { fetchWithAuth } from '@/services/apiService';
import { useQueryClient } from '@tanstack/react-query';

interface UploadCsvDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HoldingCsvRow {
  Symbol: string;
  Shares: string; // Read as string first for parsing
  AverageCost: string; // Read as string first for parsing
}

const UploadCsvDialog: React.FC<UploadCsvDialogProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient(); // Add this to invalidate cache

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Using optional chaining as recommended by the linter
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    Papa.parse<HoldingCsvRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        const errors = results.errors;

        if (errors.length > 0) {
          console.error('CSV Parsing errors details:', errors);
          const errorMessages = errors.slice(0, 3).map(e => `Row ${e.row}: ${e.message}`).join('; '); // Show first 3 errors
          toast({
            title: 'CSV Parsing Error',
            description: `Errors found: ${errorMessages}${errors.length > 3 ? '...' : ''}`,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Validate required headers and format data
        const requiredHeaders = ['Symbol', 'Shares', 'AverageCost'];
        const actualHeaders = Object.keys(parsedData[0] || {});
        if (!requiredHeaders.every(header => actualHeaders.includes(header))) {
             toast({
               title: 'Invalid CSV Headers',
               description: 'CSV must contain columns: Symbol, Shares, AverageCost',
               variant: 'destructive',
             });
             setIsLoading(false);
             return;
        }

        const formattedHoldings = parsedData.map(row => ({
          symbol: row.Symbol?.trim(),
          shares: parseFloat(row.Shares),
          averageCost: parseFloat(row.AverageCost),
        })).filter(h => h.symbol && !isNaN(h.shares) && h.shares > 0 && !isNaN(h.averageCost) && h.averageCost >= 0);

        if (formattedHoldings.length === 0) {
          toast({
            title: 'No valid holdings found',
            description: 'Check the CSV data and format.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // --- Send data to backend --- 
        try {
          const response = await fetchWithAuth(`/api/portfolio/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedHoldings),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to upload holdings' }));
            throw new Error(errorData.detail || 'Failed to upload holdings');
          }

          queryClient.invalidateQueries({ queryKey: ['portfolio'] });
          
          toast({
            title: 'Upload Successful',
            description: `${formattedHoldings.length} holdings uploaded.`,
          });

          setSelectedFile(null); 
          if (fileInputRef.current) {
            fileInputRef.current.value = ''; 
          }
          onClose(); 

        } catch (error: any) {
          toast({
            title: 'Error Uploading CSV',
            description: error.message || 'Something went wrong during the upload.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      },
      error: (error) => {
        console.error('CSV Parsing error:', error);
        toast({
          title: 'Error Reading File',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-6">
        <DialogHeader>
          <DialogTitle>Upload Holdings CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: Symbol, Shares, AverageCost. This will overwrite your current portfolio.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="col-span-4"
            />
          </div>
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedFile.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Expected columns: Symbol, Shares, AverageCost
          </p>
        </div>
        <DialogFooter className="sm:justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isLoading || !selectedFile}
            className="flex-1 sm:flex-initial"
          >
            {isLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadCsvDialog; 