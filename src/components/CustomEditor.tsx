"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";

// 靜態導入 CKEditor CSS（必須在頂層導入）
import "ckeditor5/ckeditor5.css";

// 定義 Props 類型供內外使用
export interface CustomEditorProps {
  onContentChange: (value: string) => void;
  height?: string | number;
  placeholder?: string;
  initialData?: string;
}

// 編輯器載入中的骨架屏
function EditorSkeleton({ height }: { height: string | number }) {
  const heightValue = typeof height === "number" ? `${height}px` : height;
  return (
    <div className="editor-skeleton animate-pulse">
      <div className="bg-gray-200 rounded-t-md h-10 flex items-center px-2 gap-1">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-300 h-6 w-6 rounded" />
        ))}
      </div>
      <div
        className="bg-gray-100 rounded-b-md border border-gray-200"
        style={{ height: heightValue }}
      />
    </div>
  );
}

// 實際的 CKEditor 組件（懶載入）
function CKEditorCore({
  placeholder,
  onContentChange,
  height = "200px",
  initialData = "",
}: CustomEditorProps) {
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [CKEditorModule, setCKEditorModule] = useState<any>(null);
  const [editorPlugins, setEditorPlugins] = useState<any>(null);
  const [translations, setTranslations] = useState<any>(null);

  // 動態載入 CKEditor 模組
  useEffect(() => {
    let isMounted = true;

    const loadEditor = async () => {
      try {
        const [ckeditorReact, ckeditor5, translationsModule] = await Promise.all([
          import("@ckeditor/ckeditor5-react"),
          import("ckeditor5"),
          import("ckeditor5/translations/zh.js"),
        ]);

        if (isMounted) {
          setCKEditorModule(ckeditorReact);
          setEditorPlugins(ckeditor5);
          setTranslations(translationsModule.default);
          setIsReady(true);
        }
      } catch (error) {
        console.error("Failed to load CKEditor:", error);
      }
    };

    loadEditor();

    return () => {
      isMounted = false;
    };
  }, []);

  const editorConfig = useMemo(() => {
    if (!isReady || !editorPlugins) return {};

    const {
      Alignment,
      Autoformat,
      AutoImage,
      AutoLink,
      Autosave,
      Base64UploadAdapter,
      BlockQuote,
      Bold,
      Emoji,
      Essentials,
      FontBackgroundColor,
      FontColor,
      FontFamily,
      FontSize,
      Heading,
      Highlight,
      HorizontalLine,
      ImageBlock,
      ImageCaption,
      ImageInline,
      ImageInsert,
      ImageInsertViaUrl,
      ImageResize,
      ImageStyle,
      ImageToolbar,
      ImageUpload,
      Indent,
      IndentBlock,
      Italic,
      Link,
      LinkImage,
      List,
      ListProperties,
      Mention,
      Paragraph,
      RemoveFormat,
      Strikethrough,
      Table,
      TableCaption,
      TableCellProperties,
      TableColumnResize,
      TableProperties,
      TableToolbar,
      TextTransformation,
      TodoList,
      Underline,
    } = editorPlugins;

    return {
      toolbar: {
        items: [
          "heading",
          "|",
          "fontSize",
          "fontFamily",
          "fontColor",
          "fontBackgroundColor",
          "|",
          "bold",
          "italic",
          "underline",
          "strikethrough",
          "removeFormat",
          "|",
          "emoji",
          "horizontalLine",
          "link",
          "insertImage",
          "insertTable",
          "highlight",
          "blockQuote",
          "|",
          "alignment",
          "|",
          "bulletedList",
          "numberedList",
          "todoList",
          "outdent",
          "indent",
        ],
        shouldNotGroupWhenFull: false,
      },
      plugins: [
        Alignment,
        Autoformat,
        AutoImage,
        AutoLink,
        Autosave,
        Base64UploadAdapter,
        BlockQuote,
        Bold,
        Emoji,
        Essentials,
        FontBackgroundColor,
        FontColor,
        FontFamily,
        FontSize,
        Heading,
        Highlight,
        HorizontalLine,
        ImageBlock,
        ImageCaption,
        ImageInline,
        ImageInsert,
        ImageInsertViaUrl,
        ImageResize,
        ImageStyle,
        ImageToolbar,
        ImageUpload,
        Indent,
        IndentBlock,
        Italic,
        Link,
        LinkImage,
        List,
        ListProperties,
        Mention,
        Paragraph,
        RemoveFormat,
        Strikethrough,
        Table,
        TableCaption,
        TableCellProperties,
        TableColumnResize,
        TableProperties,
        TableToolbar,
        TextTransformation,
        TodoList,
        Underline,
      ],
      fontFamily: {
        supportAllValues: true,
      },
      fontSize: {
        options: [10, 12, 14, "default", 18, 20, 22],
        supportAllValues: true,
      },
      heading: {
        options: [
          {
            model: "paragraph" as const,
            title: "段落",
            class: "ck-heading_paragraph",
          },
          {
            model: "heading1" as const,
            view: "h1",
            title: "標題 1",
            class: "ck-heading_heading1",
          },
          {
            model: "heading2" as const,
            view: "h2",
            title: "標題 2",
            class: "ck-heading_heading2",
          },
          {
            model: "heading3" as const,
            view: "h3",
            title: "標題 3",
            class: "ck-heading_heading3",
          },
          {
            model: "heading4" as const,
            view: "h4",
            title: "標題 4",
            class: "ck-heading_heading4",
          },
          {
            model: "heading5" as const,
            view: "h5",
            title: "標題 5",
            class: "ck-heading_heading5",
          },
          {
            model: "heading6" as const,
            view: "h6",
            title: "標題 6",
            class: "ck-heading_heading6",
          },
        ],
      },
      image: {
        toolbar: [
          "toggleImageCaption",
          "imageTextAlternative",
          "|",
          "imageStyle:inline",
          "imageStyle:wrapText",
          "imageStyle:breakText",
          "|",
          "resizeImage",
        ],
      },
      initialData: initialData,
      language: "zh",
      licenseKey: "GPL",
      link: {
        addTargetToExternalLinks: true,
        defaultProtocol: "https://",
        decorators: {
          toggleDownloadable: {
            mode: "manual" as const,
            label: "可下載",
            attributes: {
              download: "file",
            },
          },
        },
      },
      list: {
        properties: {
          styles: true,
          startIndex: true,
          reversed: true,
        },
      },
      mention: {
        feeds: [
          {
            marker: "@",
            feed: [],
          },
        ],
      },
      placeholder: placeholder || "在此輸入或貼上您的內容！",
      table: {
        contentToolbar: [
          "tableColumn",
          "tableRow",
          "mergeTableCells",
          "tableProperties",
          "tableCellProperties",
        ],
      },
      translations: translations ? [translations] : [],
    };
  }, [isReady, editorPlugins, initialData, placeholder, translations]);

  const handleEditorChange = (event: any, editor: any) => {
    const data = editor.getData();
    if (onContentChange) {
      onContentChange(data);
    }
  };

  // 顯示骨架屏直到編輯器載入完成
  if (!isReady || !CKEditorModule || !editorPlugins) {
    return <EditorSkeleton height={height} />;
  }

  const { CKEditor } = CKEditorModule;
  const { ClassicEditor } = editorPlugins;

  return (
    <div className="editor-wrapper">
      <style>{`
        .ck-editor__editable_inline {
          min-height: ${typeof height === "number" ? `${height}px` : height};
          max-height: ${typeof height === "number" ? `${height}px` : height};
        }
      `}</style>
      <div className="editor-container" ref={editorContainerRef}>
        <div className="editor-container__editor" ref={editorRef}>
          <CKEditor
            editor={ClassicEditor}
            config={editorConfig}
            onChange={handleEditorChange}
          />
        </div>
      </div>
    </div>
  );
}

// 主要導出組件 - 使用 next/dynamic 進行 SSR 安全的懶載入
const CustomEditor = dynamic<CustomEditorProps>(
  () => Promise.resolve(CKEditorCore),
  {
    ssr: false,
    loading: () => <EditorSkeleton height="200px" />,
  }
);

export default CustomEditor;
