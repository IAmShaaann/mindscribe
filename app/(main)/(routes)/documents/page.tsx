"use client";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { PlusCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
const DocumentsPage = () => {
  const { user } = useUser();
  const create = useMutation(api.documents.create);

  const onCreate = () => {
    const promise = create({ title: "Untitled" });
    toast.promise(promise, {
      loading: "Creating a note",
      success: "Note creation successful",
      error: "Note creation failed",
    });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4">
      <Image
        src={"/img/empty.png"}
        alt="Empty Documents"
        height="300"
        width="300"
        className="dark:hidden"
      />
      <Image
        src={"/img/empty-dark.png"}
        alt="Empty Documents"
        height="300"
        width="300"
        className="hidden dark:block"
      />
      <h2 className="text-lg font-medium">
        Welcome to {user?.firstName}&apos;s MindScribe.
      </h2>
      <Button onClick={onCreate}>
        <PlusCircle className="h-4 w-4 mr-2" /> Create a Scribe
      </Button>
    </div>
  );
};
export default DocumentsPage;
