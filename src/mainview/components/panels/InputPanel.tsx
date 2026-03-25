import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type InputPanelProps = {
  targetInput: string;
  lastTranscript: string;
  lastProcessed: string;
  lastAudioPath: string;
  inputHint: string;
  onChangeTargetInput: (value: string) => void;
};

export function InputPanel({
  targetInput,
  lastTranscript,
  lastProcessed,
  lastAudioPath,
  inputHint,
  onChangeTargetInput,
}: InputPanelProps) {
  return (
    <Card className="bg-neutral-900 text-neutral-100">
      <CardHeader>
        <CardTitle className="text-base">输入框回填测试</CardTitle>
        <CardDescription className="text-neutral-400">
          转写完成后会尝试填充当前聚焦输入框；如果没有聚焦输入框，则回填到下方文本区。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          className="border-neutral-700 bg-neutral-950 text-neutral-100"
          placeholder="这里是当前输入框（测试用）"
        />

        <Textarea
          className="min-h-28 border-neutral-700 bg-neutral-950 text-neutral-100"
          value={targetInput}
          onChange={(e) => onChangeTargetInput(e.target.value)}
          placeholder="如果没有可用焦点输入框，文本会回填到这里"
        />

        <p className="text-xs text-neutral-400">最近转写（原始）：{lastTranscript || "暂无"}</p>
        <p className="text-xs text-neutral-400">最近转写（处理后）：{lastProcessed || "暂无"}</p>
        <p className="text-xs text-neutral-400">音频文件：{lastAudioPath || "暂无"}</p>
        {inputHint && <Badge variant="secondary">{inputHint}</Badge>}
      </CardContent>
    </Card>
  );
}
