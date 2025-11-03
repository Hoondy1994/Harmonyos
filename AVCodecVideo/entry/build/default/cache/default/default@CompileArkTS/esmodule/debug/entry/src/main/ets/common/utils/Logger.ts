import hilog from "@ohos:hilog";
class Logger {
    private domain: number;
    private format: string = '%{public}s';
    constructor() {
        this.domain = 0xFF00;
    }
    debug(...arg: string[]): void {
        hilog.debug(this.domain, arg[0], this.format, arg[1]);
    }
    info(...arg: string[]): void {
        hilog.info(this.domain, arg[0], this.format, arg[1]);
    }
    warn(...arg: string[]): void {
        hilog.warn(this.domain, arg[0], this.format, arg[1]);
    }
    error(...arg: string[]): void {
        hilog.error(this.domain, arg[0], this.format, arg[1]);
    }
}
export default new Logger();
