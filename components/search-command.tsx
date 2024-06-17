"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { File } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { useUser } from "@clerk/clerk-react";
import { useSearch } from "@/hooks/user-search";

const SearchCommand = () => {
  const { user } = useUser();
  const router = useRouter();
  const documents = useQuery(api.documents.getSearch);
  const [isMounted, setIsMounted] = useState(false);

  const isOpen = useSearch((store) => store.isOpen);
  const toggle = useSearch((store) => store.toggle);
  const onClose = useSearch((store) => store.onClose);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        console.log("event: ", event);
        event.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
    };
  }, [toggle]);

  const onSelect = (id: string) => {
    router.push(`/documents/${id}`);
    onClose();
  };

  if (!isMounted) return null;

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput placeholder={`Search ${user?.fullName}'s MindScribe...`} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
      </CommandList>
      <CommandGroup heading="Documents">
        {documents?.map((document) => (
          <CommandItem
            key={document._id}
            value={`${document._id}-${document.title}`}
            title={document.title}
            onSelect={onSelect}
          >
            {document.icon ? (
              <p className="mr-2 text-[18]px">{document.icon}</p>
            ) : (
              <File className="mr-2 h-4 w-4" />
            )}
            <span>{document.title} </span>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandDialog>
  );
};

export default SearchCommand;
