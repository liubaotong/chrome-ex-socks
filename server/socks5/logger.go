package socks5

import (
	"github.com/fatih/color"
	"time"
)

type Logger struct {
	info  *color.Color
	error *color.Color
	debug *color.Color
}

func NewLogger() *Logger {
	return &Logger{
		info:  color.New(color.FgGreen),
		error: color.New(color.FgRed),
		debug: color.New(color.FgYellow),
	}
}

func (l *Logger) Info(format string, args ...interface{}) {
	l.log("INFO", l.info, format, args...)
}

func (l *Logger) Error(format string, args ...interface{}) {
	l.log("ERROR", l.error, format, args...)
}

func (l *Logger) Debug(format string, args ...interface{}) {
	l.log("DEBUG", l.debug, format, args...)
}

func (l *Logger) log(level string, c *color.Color, format string, args ...interface{}) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	c.Printf("[%s] [%s] "+format+"\n", append([]interface{}{timestamp, level}, args...)...)
} 