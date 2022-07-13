# Mastering Node.js

## 1. Understanding the Node Environment
## 2. Understanding Asynchronous Event-Driven Programming
## 3. Streaming Data Across Nodes and Clients
## 4. Using Node to Access the Filesystem
## 5. Managing Many Simultaneous Client Connections
## 6. Creating Real-Time Applications
## 7. Using Multiple Processes
## 8. Scaling Your Application
## 9. Microservices
## 10. Testing Your Application
## Appendix A: Organizing Your work into Modules
## Appendix B: Creating your own C++ add-ons

---
---

# 1. Understanding the Node Environment

```>```

## Posix

POSIX, the Portable Operating System Interface, defines the standard APIs for Unix. It's adopted in Unix-based operating systems and beyond. The IEEE created and maintains the POSIX standard to enable systems from different manufacturers to be compatible. Write your C program using POSIX APIs on your laptop running macOS, and you'll have an easier time later building it on a Raspberry Pi.

As a common denominator, POSIX is old, simple, and most importantly, wellknown to developers of all stripes. To make a new directory in a C program, use this API:

```
int mkdir(const char *path, mode_t mode);
```

And here it is in Node:

```
fs.mkdir(path[, mode], callback)
```

The Node documentation for the filesystem module starts out by telling the developer, there's nothing new here:

File I/O is provided by simple wrappers around standard POSIX functions. https://nodejs.org/api/fs.html

For Node, Ryan Dahl implemented proven POSIX APIs, rather than trying to come up with something on his own. While such an attempt might be better in some ways, or some situations, it would lose the instant familiarity that POSIX gives to new Node developers trained in other systems.

In choosing POSIX for the API, Node is in no way limited to the standards from the 1970s. It's easy for anyone to write their own module that calls down to Node's API, while presenting a different one upwards. These fancier alternatives can then compete in a Darwinian quest to prove themselves better than POSIX.

## Optimizing your code

The simple optimizations of smart code design can really help you. Traditionally, JavaScript developers working in browsers did not need to concern themselves with memory usage optimizations, having quite a lot to use for what were typically uncomplicated programs. On a server, this is no longer the case. Programs are generally more complicated, and running out of memory takes down your server.

The convenience of a dynamic language is in avoiding the strictness that compiled languages impose. For example, you need not explicitly define object property types, and can actually change those property types at will. This dynamism makes traditional compilation impossible, but opens up some interesting new opportunities for exploratory languages such as JavaScript. Nevertheless, dynamism introduces a significant penalty in terms of execution speeds when compared to statically compiled languages. The limited speed of JavaScript has regularly been identified as one of its major weaknesses.

V8 attempts to achieve the sorts of speeds one observes for compiled languages for JavaScript. V8 compiles JavaScript into native machine code, rather than interpreting bytecode, or using other just-in-time techniques. Because the precise runtime topology of a JavaScript program cannot be known ahead of time (the language is dynamic), compilation consists of a two-stage, speculative approach:

* 1. Initially, a first-pass compiler (the full compiler) converts your code into a runnable state as quickly as possible. During this step, type analysis and other detailed analysis of the code is deferred, prioritizing fast compilation – your JavaScript can begin executing as close to instantly as possible. Further optimizations are accomplished during the second step.
* 2. Once the program is up and running, an optimizing compiler then begins its job of watching how your program runs, and attempting to determine its current and future runtime characteristics, optimizing and re-optimizing as necessary. For example, if a certain function is being called many thousands of times with similar arguments of a consistent type, V8 will recompile that function with code optimized on the optimistic assumption that future types will be like the past types. While the first compile step was conservative with as-yet unknown and un-typed functional signature, this hot function's predictable texture impels V8 to assume a certain optimal profile and re-compile based on that assumption.

Assumptions help us make decisions more quickly, but can lead to mistakes. What if the hot function V8's compiler just optimized against a certain type signature is now called with arguments violating that optimized profile? V8 has no choice, in that case: it must de-optimize the function. V8 must admit its mistake and roll back the work it has done. It will re-optimize in the future if a new pattern is seen. However, if V8 must again de-optimize at a later time, and if this optimize/de-optimize binary switching continues, V8 will simply give up, and leave your code in a de-optimized state.

Let's look at some ways to approach the design and declaration of arrays, objects, and functions, so that you are helping, rather than hindering the compiler.

## Numbers and tracing optimization/de-optimization

The ECMA-262 specification defines the Number value as a "primitive value corresponding to a double-precision 64-bit binary format IEEE 754 value". The point is that there is no Integer type in JavaScript; there is a Number type defined as a double-precision floating-point number.

V8 uses 32-bit numbers for all values internally, for performance reasons that are too technical to discuss here. It can be said that one bit is used to point to another 32-bit number, should greater width be needed. Regardless, it is clear that there are two types of values tagged as numbers by V8, and switching between these types will cost you something. Try to restrict your needs to 31-bit signed Integers where possible. Because of the type ambiguity of JavaScript, switching the types of numbers assigned to a slot is allowed. For example, the following code does not throw an error:

```JavaScript
let a = 7;
a = 7.77;
```

However, a speculative compiler like V8 will be unable to optimize this variable assignment, given that its guess that a will always be an Integer turned out to be wrong, forcing de-optimization.

We can demonstrate the optimization/de-optimization process by setting some powerful V8 options, executing V8 native commands in your Node program, and tracing how v8 optimizes/de-optimizes your code.

Consider the following Node program:

```JavaScript
// program.js 
let someFunc = function foo(){} 
console.log(%FunctionGetName(someFunc));
```

If you try to run this normally, you will receive an Unexpected Token error – the modulo (%) symbol cannot be used within an identifier name in JavaScript. What is this strange method with a % prefix? It is a V8 native command, and we can turn on execution of these types of functions by using the --allow-nativessyntax flag:

```bash 
$ node --allow-natives-syntax program.js
// 'someFunc', the function name, is printed to the console. 
```

Now, consider the following code, which uses native functions to assert information about the optimization status of the square function, using the %OptimizeFunctionOnNextCall native method:

```JavaScript
let operand = 3; 
function square() {      } 
// Make first pass to gather type information square(); 
// Ask that the next call of #square trigger an optimization attempt; 
// Call %OptimizeFunctionOnNextCall(square); square(); 
```

Create a file using the previous code, and execute it using the following command: node --allow-natives-syntax --trace_opt --trace_deopt myfile.js. You will see something like the following returned:

``` 
deoptimize context: c39daf14679]
[optimizing: square / c39dafca921 - took 1.900, 0.851, 0.000 ms]
```

We can see that V8 has no problem optimizing the square function, as operand is declared once and never changed. Now, append the following lines to your file and run it again:

```JavaScript 
%OptimizeFunctionOnNextCall(square); 
operand = 3.01; 
square();
```

On this execution, following the optimization report given earlier, you should now receive something like the following:

``` 
**** DEOPT: square at bailout #2, address 0x0, frame size 8 [deoptimizing: begin 0x2493d0fca8d9 square @2] 
... 
[deoptimizing: end 0x2493d0fca8d9 square => node=3, pc=0x29edb8164b46, state=NO_REGISTERS, alignment=[removing optimized code for: square] ```

This very expressive optimization report tells the story very clearly: the onceoptimized square function was de-optimized following the change we made in one number's type. You are encouraged to spend some time writing code and testing it using these methods