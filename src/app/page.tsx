export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-24">
      <h1 className="text-5xl font-bold text-primary">Hello, 0xShoyu</h1>
      <p className="text-xl text-foreground/80">
        Turning Business Logic into Shipable Code.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl">
        <p>如果看到深蓝色背景和这张卡片，说明配置成功了。</p>
      </div>
    </div>
  );
}
