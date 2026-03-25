import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RuntimeConfig } from "../../types";

type DictionaryModuleProps = {
  runtimeConfig: RuntimeConfig;
  onRuntimeConfigChange: (patch: Partial<RuntimeConfig>) => void;
};

export function DictionaryModule({
  runtimeConfig,
  onRuntimeConfigChange,
}: DictionaryModuleProps) {
  const [newWord, setNewWord] = useState("");
  const commonWords = Array.isArray(runtimeConfig.asrCommonWords) ? runtimeConfig.asrCommonWords : [];

  const addCommonWord = () => {
    const word = newWord.trim();
    if (!word) return;
    if (commonWords.includes(word)) {
      setNewWord("");
      return;
    }
    onRuntimeConfigChange({ asrCommonWords: [...commonWords, word] });
    setNewWord("");
  };

  const removeCommonWord = (word: string) => {
    onRuntimeConfigChange({ asrCommonWords: commonWords.filter((item) => item !== word) });
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-5xl leading-none tracking-[-0.03em] text-stone-950">词典</h2>
        <p className="max-w-[44ch] text-sm leading-7 text-stone-600">
          维护常用词和专有名词，帮助识别阶段与轻修正阶段更稳定地输出你期望的写法。
        </p>
      </div>

      <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-950">常用词库</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCommonWord();
                }
              }}
              placeholder="输入常用词、品牌名、产品名后回车"
              className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
            />
            <Button
              type="button"
              onClick={addCommonWord}
              className="gap-1 rounded-md bg-stone-950 text-stone-50 whitespace-nowrap hover:bg-stone-950 hover:text-stone-50"
            >
              <Plus className="h-4 w-4" />
              新增
            </Button>
          </div>

          <div className="rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] px-4 py-3 text-xs leading-6 text-stone-500">
            适合放公司名、人名、产品名、英文缩写、业务术语等高频词。添加后会一起参与识别热词和轻修正提示词。
          </div>

          <div className="flex flex-wrap gap-2">
            {commonWords.length === 0 && <span className="text-xs text-stone-500">暂无词条</span>}
            {commonWords.map((word) => (
              <div
                key={word}
                className="inline-flex items-center gap-1 rounded-sm border border-stone-200 bg-stone-50/80 px-3 py-1.5 text-xs text-stone-700"
              >
                <span>{word}</span>
                <button
                  type="button"
                  aria-label={`删除常用词 ${word}`}
                  className="rounded-sm p-0.5 text-stone-400 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                  onClick={() => removeCommonWord(word)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
