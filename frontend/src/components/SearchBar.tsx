
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const SearchBar = () => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ios-gray h-4 w-4" />
      <Input
        type="search"
        placeholder="Search stocks..."
        className="pl-9 rounded-full bg-ios-light-gray border-0"
      />
    </div>
  );
};

export default SearchBar;
